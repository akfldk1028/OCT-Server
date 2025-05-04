import {
  bigint,
  boolean,
  jsonb,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { products } from "../products/schema";
import { posts } from "../community/schema";
import { sql } from "drizzle-orm";

export const users = pgSchema("auth").table("users", {
  id: uuid().primaryKey(),
});

export const roles = pgEnum("role", [
  "developer",
  "designer",
  "marketer",
  "founder",
  "product-manager",
]);

export const profiles = pgTable("profiles", {
  profile_id: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  avatar: text(),
  name: text().notNull(),
  username: text().notNull(),
  headline: text(),
  bio: text(),
  role: roles().default("developer").notNull(),
  stats: jsonb()
    .$type<{
      followers: number;
      following: number;
    }>()
    .default({ followers: 0, following: 0 }),
  views: jsonb(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});

export const follows = pgTable(
  "follows",
  {
    follower_id: uuid()
      .references(() => profiles.profile_id, {
        onDelete: "cascade",
      })
      .notNull(),
    following_id: uuid()
      .references(() => profiles.profile_id, {
        onDelete: "cascade",
      })
      .notNull(),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.follower_id, table.following_id] })]
);

export const notificationType = pgEnum("notification_type", [
  "follow",
  "review",
  "reply",
]);

export const notifications = pgTable("notifications", {
  notification_id: bigint({ mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  source_id: uuid().references(() => profiles.profile_id, {
    onDelete: "cascade",
  }),
  product_id: bigint({ mode: "number" }).references(() => products.product_id, {
    onDelete: "cascade",
  }),
  post_id: bigint({ mode: "number" }).references(() => posts.post_id, {
    onDelete: "cascade",
  }),
  target_id: uuid()
    .references(() => profiles.profile_id, {
      onDelete: "cascade",
    })
    .notNull(),
  seen: boolean().default(false).notNull(),
  type: notificationType().notNull(),
  created_at: timestamp().notNull().defaultNow(),
});

export const messageRooms = pgTable("message_rooms", {
  message_room_id: bigint({ mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  created_at: timestamp().notNull().defaultNow(),
});

export const messageRoomMembers = pgTable(
  "message_room_members",
  {
    message_room_id: bigint({ mode: "number" }).references(
      () => messageRooms.message_room_id,
      {
        onDelete: "cascade",
      }
    ),
    profile_id: uuid().references(() => profiles.profile_id, {
      onDelete: "cascade",
    }),
    created_at: timestamp().notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.message_room_id, table.profile_id] }),
    pgPolicy("message_room_members_policy", {
      for: "select",
      to: authenticatedRole,
      as: "permissive",
      using: sql`public.is_user_member(${table.message_room_id}, auth.uid())`,
    }),
  ]
);

export const messages = pgTable("messages", {
  message_id: bigint({ mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  message_room_id: bigint({ mode: "number" })
    .references(() => messageRooms.message_room_id, {
      onDelete: "cascade",
    })
    .notNull(),
  sender_id: uuid()
    .references(() => profiles.profile_id, {
      onDelete: "cascade",
    })
    .notNull(),
  content: text().notNull(),
  created_at: timestamp().notNull().defaultNow(),
});
