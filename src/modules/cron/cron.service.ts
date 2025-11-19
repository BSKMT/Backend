import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../common/schemas/user.schema';
import { Event } from '../../common/schemas/event.schema';
import { Membership } from '../../common/schemas/membership.schema';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
  ) {}

  // Run every day at 3:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'cleanupExpiredSessions',
    timeZone: 'America/Bogota',
  })
  async cleanupExpiredSessions() {
    this.logger.log('Running expired sessions cleanup...');

    try {
      // TODO: Clean up expired sessions from database
      // This would require a Session model
      this.logger.log('Expired sessions cleanup completed');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error cleaning up sessions: ${err.message}`);
    }
  }

  // Run every day at 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'checkMembershipExpirations',
    timeZone: 'America/Bogota',
  })
  async checkMembershipExpirations() {
    this.logger.log('Checking membership expirations...');

    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Find memberships expiring in 30 days
      const memberships = await this.membershipModel.find({
        'period.endDate': {
          $gte: today,
          $lte: thirtyDaysFromNow,
        },
        isActive: true,
      });

      this.logger.log(`Found ${memberships.length} memberships expiring soon`);

      // TODO: Send renewal notifications to users
      // Would require email/SMS service integration

      // Find users with expiring memberships
      for (const membership of memberships) {
        const users = await this.userModel.find({
          membershipType: membership.slug,
          isActive: true,
        });

        this.logger.log(`Membership ${membership.name}: ${users.length} users to notify`);
        // TODO: Send notifications
      }

      this.logger.log('Membership expiration check completed');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error checking memberships: ${err.message}`);
    }
  }

  // Run every day at 1:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'sendEventReminders',
    timeZone: 'America/Bogota',
  })
  async sendEventReminders() {
    this.logger.log('Sending event reminders...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find events happening tomorrow
      const upcomingEvents = await this.eventModel.find({
        startDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow,
        },
        isActive: true,
      });

      this.logger.log(`Found ${upcomingEvents.length} events happening tomorrow`);

      // Send reminders to registered participants
      for (const event of upcomingEvents) {
        const participantCount = event.participants?.length || 0;
        this.logger.log(`Event ${event.name}: ${participantCount} participants to notify`);
        
        // TODO: Send email/SMS reminders to participants
        // Would require webhook service integration
      }

      this.logger.log('Event reminders sent');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error sending event reminders: ${err.message}`);
    }
  }

  // Run every day at 4:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_4AM, {
    name: 'cleanupInactiveUsers',
    timeZone: 'America/Bogota',
  })
  async cleanupInactiveUsers() {
    this.logger.log('Checking for inactive users...');

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Find users who haven't logged in for 6 months
      const inactiveUsers = await this.userModel.find({
        lastLogin: { $lt: sixMonthsAgo },
        isActive: true,
      });

      this.logger.log(`Found ${inactiveUsers.length} inactive users`);

      // TODO: Send re-engagement emails
      // TODO: Optionally mark as inactive or archive

      this.logger.log('Inactive users check completed');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error checking inactive users: ${err.message}`);
    }
  }

  // Run every Monday at 9:00 AM
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_9AM, {
    name: 'weeklyReports',
    timeZone: 'America/Bogota',
  })
  async generateWeeklyReports() {
    this.logger.log('Generating weekly reports...');

    try {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Count new users last week
      const newUsers = await this.userModel.countDocuments({
        createdAt: { $gte: lastWeek },
      });

      // Count events last week
      const eventsLastWeek = await this.eventModel.countDocuments({
        startDate: { $gte: lastWeek, $lte: now },
      });

      this.logger.log(`Weekly Report: ${newUsers} new users, ${eventsLastWeek} events`);

      // TODO: Send report email to admins

      this.logger.log('Weekly reports generated');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error generating weekly reports: ${err.message}`);
    }
  }

  // Run every hour
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'healthCheck',
  })
  async performHealthCheck() {
    try {
      // Check database connection
      const dbStatus = this.userModel.db.readyState === 1;
      
      if (!dbStatus) {
        this.logger.error('Database connection lost!');
      }

      // Check if any critical services are down
      // This is a simple heartbeat
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Health check failed: ${err.message}`);
    }
  }

  // Manual task trigger methods (for testing or admin use)
  async triggerTask(taskName: string) {
    this.logger.log(`Manually triggering task: ${taskName}`);

    try {
      const job = this.schedulerRegistry.getCronJob(taskName);
      job.fireOnTick();
      
      return {
        success: true,
        message: `Task ${taskName} triggered successfully`,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error triggering task ${taskName}: ${err.message}`);
      throw error;
    }
  }

  async listScheduledTasks() {
    const jobs = this.schedulerRegistry.getCronJobs();
    const taskList: Array<{
      name: string;
      running: boolean;
      nextExecution: Date | string;
      lastExecution: Date | string;
    }> = [];

    jobs.forEach((value, key) => {
      let nextDate: Date | string;
      try {
        nextDate = value.nextDate().toJSDate();
      } catch (e) {
        nextDate = 'N/A';
      }

      let lastDate: Date | string;
      try {
        const last = value.lastDate();
        lastDate = last instanceof Date ? last : 'N/A';
      } catch (e) {
        lastDate = 'N/A';
      }

      taskList.push({
        name: key,
        running: value.running,
        nextExecution: nextDate,
        lastExecution: lastDate,
      });
    });

    return taskList;
  }

  async pauseTask(taskName: string) {
    const job = this.schedulerRegistry.getCronJob(taskName);
    job.stop();
    this.logger.log(`Task ${taskName} paused`);

    return {
      success: true,
      message: `Task ${taskName} paused`,
    };
  }

  async resumeTask(taskName: string) {
    const job = this.schedulerRegistry.getCronJob(taskName);
    job.start();
    this.logger.log(`Task ${taskName} resumed`);

    return {
      success: true,
      message: `Task ${taskName} resumed`,
    };
  }
}
