import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../common/schemas/user.schema';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findAll(filters?: {
    membershipType?: string;
    isActive?: boolean;
    city?: string;
    role?: string;
  }): Promise<UserDocument[]> {
    const query: any = {};

    if (filters?.membershipType) query.membershipType = filters.membershipType;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;
    if (filters?.city) query.city = filters.city;
    if (filters?.role) query.role = filters.role;

    return this.userModel
      .find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -emailVerificationToken -passwordResetToken')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true, runValidators: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async updateRole(id: string, role: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { role }, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async toggleStatus(id: string, isActive: boolean): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userModel.findById(id).select('+password').exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isPasswordValid = user.comparePassword 
      ? await user.comparePassword(changePasswordDto.currentPassword)
      : false;

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = changePasswordDto.newPassword;
    await user.save();
  }

  async updateMembership(id: string, membershipType: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { membershipType }, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async getUserStats(id: string) {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      totalEvents: user.events?.length || 0,
      attendedEvents: user.attendedEvents?.length || 0,
      favoriteEvents: user.favoriteEvents?.length || 0,
      memberSince: user.joinDate,
      membershipType: user.membershipType,
      isActive: user.isActive,
    };
  }

  async searchUsers(searchTerm: string): Promise<UserDocument[]> {
    return this.userModel
      .find({
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { documentNumber: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .select('-password')
      .limit(20)
      .exec();
  }

  async getUsersByCity(city: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ city, isActive: true })
      .select('firstName lastName email city membershipType profileImage')
      .exec();
  }

  async getUsersByMembershipType(membershipType: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ membershipType, isActive: true })
      .select('firstName lastName email membershipType profileImage')
      .exec();
  }
}
