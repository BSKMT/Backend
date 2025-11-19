import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Membership } from '../../common/schemas/membership.schema';
import { User } from '../../common/schemas/user.schema';
import { CreateMembershipDto, UpdateMembershipDto, ApplyMembershipDto } from './dto/membership.dto';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createMembershipDto: CreateMembershipDto) {
    // Check if slug already exists
    const existing = await this.membershipModel.findOne({ slug: createMembershipDto.slug });
    if (existing) {
      throw new BadRequestException('Membership with this slug already exists');
    }

    const membership = new this.membershipModel(createMembershipDto);
    return membership.save();
  }

  async findAll(includeInactive: boolean = false) {
    const query = includeInactive ? {} : { isActive: true };
    return this.membershipModel
      .find(query)
      .sort({ 'categoryLevel': 1, name: 1 })
      .lean();
  }

  async findOne(id: string) {
    const membership = await this.membershipModel.findById(id).lean();
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    return membership;
  }

  async findBySlug(slug: string) {
    const membership = await this.membershipModel.findOne({ slug }).lean();
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    return membership;
  }

  async update(id: string, updateMembershipDto: UpdateMembershipDto) {
    const membership = await this.membershipModel.findByIdAndUpdate(
      id,
      updateMembershipDto,
      { new: true },
    );

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  async remove(id: string) {
    // Check if any users have this membership
    const usersWithMembership = await this.userModel.countDocuments({
      membershipType: (await this.membershipModel.findById(id))?.slug,
    });

    if (usersWithMembership > 0) {
      throw new BadRequestException(
        `Cannot delete membership. ${usersWithMembership} users are currently using it.`,
      );
    }

    const membership = await this.membershipModel.findByIdAndDelete(id);

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return { message: 'Membership deleted successfully' };
  }

  async getMembershipStatistics(membershipId: string) {
    const membership = await this.findOne(membershipId);

    const [activeMembers, totalMembers, recentApplications] = await Promise.all([
      this.userModel.countDocuments({
        membershipType: membership.slug,
        isActive: true,
      }),
      this.userModel.countDocuments({
        membershipType: membership.slug,
      }),
      this.userModel
        .find({
          membershipType: membership.slug,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
        .countDocuments(),
    ]);

    const revenue = activeMembers * membership.pricing.initial;

    return {
      membership: {
        id: membershipId,
        name: membership.name,
        slug: membership.slug,
      },
      statistics: {
        activeMembers,
        totalMembers,
        inactiveMembers: totalMembers - activeMembers,
        recentApplications,
        estimatedMonthlyRevenue: revenue,
      },
    };
  }

  async getAllMembershipStatistics() {
    const memberships = await this.findAll(true);

    const statistics = await Promise.all(
      memberships.map(async (membership) => {
        const activeMembers = await this.userModel.countDocuments({
          membershipType: membership.slug,
          isActive: true,
        });

        return {
          membershipId: membership._id,
          name: membership.name,
          slug: membership.slug,
          activeMembers,
          price: membership.pricing.initial,
          revenue: activeMembers * membership.pricing.initial,
        };
      }),
    );

    const totalRevenue = statistics.reduce((sum, stat) => sum + stat.revenue, 0);
    const totalMembers = statistics.reduce((sum, stat) => sum + stat.activeMembers, 0);

    return {
      statistics,
      totals: {
        totalMembers,
        totalRevenue,
      },
    };
  }

  async applyMembership(userId: string, applyMembershipDto: ApplyMembershipDto) {
    const membership = await this.findOne(applyMembershipDto.membershipId);
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get the price based on pricing type
    const pricingType = applyMembershipDto.pricingType as keyof typeof membership.pricing;
    const price = membership.pricing[pricingType];

    if (price === undefined) {
      throw new BadRequestException('Invalid pricing type');
    }

    // TODO: Integrate with Bold payment gateway
    // For now, just update the user's membership type
    user.membershipType = membership.slug;
    await user.save();

    return {
      success: true,
      message: 'Membership application successful',
      membership: {
        name: membership.name,
        slug: membership.slug,
        price,
      },
      // In production, return payment URL or transaction ID
    };
  }

  async compareMemberships(slugs: string[]) {
    const memberships = await Promise.all(
      slugs.map((slug) => this.findBySlug(slug)),
    );

    return memberships.map((membership) => ({
      name: membership.name,
      slug: membership.slug,
      description: membership.description,
      price: membership.pricing.initial,
      benefits: membership.benefits,
      level: membership.level,
      period: membership.period,
    }));
  }
}
