CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessId` int NOT NULL,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`systemPrompt` text,
	`welcomeMessage` text,
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`businessHoursStart` varchar(5),
	`businessHoursEnd` varchar(5),
	`businessHoursTimezone` varchar(50) DEFAULT 'UTC',
	`businessHoursEnabled` boolean DEFAULT true,
	`faqData` json,
	`whatsappPhoneId` varchar(255),
	`whatsappAccessToken` varchar(500),
	`emailSenderAddress` varchar(255),
	`emailSenderName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`businessId` int NOT NULL,
	`date` timestamp NOT NULL,
	`totalChats` int DEFAULT 0,
	`totalMessages` int DEFAULT 0,
	`totalAppointments` int DEFAULT 0,
	`completedAppointments` int DEFAULT 0,
	`cancelledAppointments` int DEFAULT 0,
	`averageSatisfactionScore` decimal(3,2),
	`totalClients` int DEFAULT 0,
	`newClients` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`clientId` int NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`status` enum('scheduled','confirmed','completed','cancelled','no-show') NOT NULL DEFAULT 'scheduled',
	`location` varchar(255),
	`meetingLink` varchar(500),
	`reminderSent` boolean DEFAULT false,
	`reminderSentAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`industry` varchar(100),
	`website` varchar(255),
	`phone` varchar(20),
	`address` text,
	`logo` varchar(500),
	`subscriptionPlan` enum('free','starter','pro','enterprise') NOT NULL DEFAULT 'free',
	`subscriptionStatus` enum('active','inactive','cancelled','expired') NOT NULL DEFAULT 'inactive',
	`subscriptionEndDate` timestamp,
	`stripeCustomerId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`clientId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`whatsappPhone` varchar(20),
	`preferredContactMethod` enum('email','whatsapp','phone') DEFAULT 'email',
	`tags` json,
	`notes` text,
	`lastInteractionAt` timestamp,
	`satisfactionScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`subscriptionId` int,
	`stripeInvoiceId` varchar(255),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`status` enum('draft','open','paid','void','uncollectible') NOT NULL DEFAULT 'open',
	`pdfUrl` varchar(500),
	`dueDate` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_stripeInvoiceId_unique` UNIQUE(`stripeInvoiceId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int,
	`clientId` int NOT NULL,
	`agentId` int NOT NULL,
	`businessId` int NOT NULL,
	`type` enum('email','whatsapp','sms') NOT NULL,
	`subject` varchar(255),
	`content` text NOT NULL,
	`status` enum('pending','sent','failed','bounced') NOT NULL DEFAULT 'pending',
	`recipientEmail` varchar(320),
	`recipientPhone` varchar(20),
	`externalId` varchar(255),
	`errorMessage` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`stripeSubscriptionId` varchar(255),
	`plan` enum('free','starter','pro','enterprise') NOT NULL,
	`status` enum('active','inactive','cancelled','expired') NOT NULL DEFAULT 'active',
	`billingCycle` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`currentPeriodStart` timestamp NOT NULL,
	`currentPeriodEnd` timestamp NOT NULL,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`)
);
