import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../common/schemas/user.schema';
import { Event } from '../../common/schemas/event.schema';
import { Membership } from '../../common/schemas/membership.schema';
import { AdminUpdateUserDto, SendBulkEmailDto, SendBulkSmsDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalEvents,
      upcomingEvents,
      totalMemberships,
      activeMemberships,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.eventModel.countDocuments(),
      this.eventModel.countDocuments({
        date: { $gte: new Date() },
        isActive: true,
      }),
      this.membershipModel.countDocuments(),
      this.membershipModel.countDocuments({ isActive: true }),
    ]);

    // Users by membership type
    const usersByMembership = await this.userModel.aggregate([
      {
        $group: {
          _id: '$membershipType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await this.userModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Event participation stats
    const eventStats = await this.eventModel.aggregate([
      {
        $project: {
          participantsCount: { $size: '$participants' },
        },
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: '$participantsCount' },
          avgParticipants: { $avg: '$participantsCount' },
        },
      },
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        recentRegistrations,
        byMembership: usersByMembership,
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        past: totalEvents - upcomingEvents,
        totalParticipants: eventStats[0]?.totalParticipants || 0,
        avgParticipants: eventStats[0]?.avgParticipants || 0,
      },
      memberships: {
        total: totalMemberships,
        active: activeMemberships,
        inactive: totalMemberships - activeMemberships,
      },
    };
  }

  async getUsersReport(startDate?: Date, endDate?: Date) {
    const query: any = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const users = await this.userModel
      .find(query)
      .select(
        'name email membershipType city isActive createdAt eventsAttended eventCount totalPoints',
      )
      .sort({ createdAt: -1 })
      .lean();

    return users;
  }

  async getEventsReport(startDate?: Date, endDate?: Date) {
    const query: any = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const events = await this.eventModel
      .find(query)
      .select('title date location.city type participants maxParticipants isActive')
      .sort({ date: -1 })
      .lean();

    return events.map((event) => ({
      ...event,
      participantCount: event.participants?.length || 0,
      occupancyRate:
        event.maxParticipants && event.maxParticipants > 0
          ? ((event.participants?.length || 0) / event.maxParticipants) * 100
          : 0,
    }));
  }

  async getMembershipReport() {
    const memberships = await this.membershipModel.find().sort({ name: 1 }).lean();

    const membershipStats = await Promise.all(
      memberships.map(async (membership) => {
        const activeCount = await this.userModel.countDocuments({
          membershipType: membership.slug,
          isActive: true,
        });
        const totalCount = await this.userModel.countDocuments({
          membershipType: membership.slug,
        });

        return {
          ...membership,
          activeMembers: activeCount,
          totalMembers: totalCount,
          revenue: membership.pricing.initial * activeCount,
        };
      }),
    );

    return membershipStats;
  }

  async updateUser(userId: string, updateData: AdminUpdateUserDto) {
    const user = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteUser(userId: string) {
    const user = await this.userModel.findByIdAndDelete(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  async searchUsers(searchTerm: string, limit: number = 50) {
    const users = await this.userModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { documentNumber: { $regex: searchTerm, $options: 'i' } },
          { membershipNumber: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .select('name email membershipType membershipNumber city isActive')
      .limit(limit)
      .lean();

    return users;
  }

  async getUserActivity(userId: string, days: number = 30) {
    const user = await this.userModel.findById(userId).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get recent events attended
    const recentEvents = await this.eventModel
      .find({
        'participants.userId': userId,
        date: { $gte: dateThreshold },
      })
      .select('title date location.city type')
      .sort({ date: -1 })
      .lean();

    return {
      user: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        membershipType: user.membershipType,
        eventsCount: user.events?.length || 0,
        attendedEventsCount: user.attendedEvents?.length || 0,
      },
      recentEvents,
      activitySummary: {
        eventsAttended: recentEvents.length,
        lastEventDate: recentEvents[0]?.startDate || null,
        daysActive: days,
      },
    };
  }

  // Placeholder for bulk email functionality
  async sendBulkEmail(emailData: SendBulkEmailDto) {
    // TODO: Implement email service integration
    // This would use Resend, SendGrid, or another email service
    console.log('Sending bulk email to:', emailData.recipients.length, 'recipients');
    
    return {
      success: true,
      message: `Email queued for ${emailData.recipients.length} recipients`,
      // In production, return job ID for tracking
    };
  }

  // Placeholder for bulk SMS functionality
  async sendBulkSms(smsData: SendBulkSmsDto) {
    // TODO: Implement MessageBird integration from Frontend/lib/messagebird.ts
    console.log('Sending bulk SMS to:', smsData.recipients.length, 'recipients');
    
    return {
      success: true,
      message: `SMS queued for ${smsData.recipients.length} recipients`,
      // In production, return job ID for tracking
    };
  }

  async getSystemHealth() {
    const dbStatus = this.userModel.db.readyState === 1 ? 'connected' : 'disconnected';
    
    return {
      database: {
        status: dbStatus,
        collections: {
          users: await this.userModel.countDocuments(),
          events: await this.eventModel.countDocuments(),
          memberships: await this.membershipModel.countDocuments(),
        },
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date(),
    };
  }
}
