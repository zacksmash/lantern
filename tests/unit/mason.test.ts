// @ts-nocheck
import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { DatabaseManager } from "@core/Database/DatabaseManager";
import { MasonManager } from "@core/Mason/MasonManager";
import { Model } from "@core/Mason/Model";
import { setMasonResolver } from "@core/Mason/Resolver";

type UserAttributes = {
	id: number;
	country_id?: number;
	name: string;
	email: string;
	created_at?: string;
	updated_at?: string;
};

type PostAttributes = {
	id: number;
	user_id: number;
	title: string;
	created_at?: string;
	updated_at?: string;
};

type ProfileAttributes = {
	id: number;
	user_id: number;
	bio: string;
	created_at?: string;
	updated_at?: string;
};

type CountryAttributes = {
	id: number;
	name: string;
};

type RoleAttributes = {
	id: number;
	name: string;
};

type ImageAttributes = {
	id: number;
	imageable_id: number;
	imageable_type: string;
	url: string;
	created_at?: string;
};

type TagAttributes = {
	id: number;
	name: string;
};

type ActivityAttributes = {
	id: number;
	subject_id: number;
	subject_type: string;
	description: string;
};

class Country extends Model<CountryAttributes> {
	static override table = "countries";
	static override timestamps = false;

	users() {
		return this.hasMany(User, "country_id");
	}

	postsThroughUsers() {
		return this.hasManyThrough(Post, User, "country_id", "user_id");
	}

	primaryProfile() {
		return this.hasOneThrough(Profile, User, "country_id", "user_id");
	}
}

class User extends Model<UserAttributes> {
	static override table = "users";

	posts() {
		return this.hasMany(Post, "user_id");
	}

	profile() {
		return this.hasOne(Profile, "user_id");
	}

	latestPost() {
		return this.latestOfMany(Post, "user_id", undefined, "created_at");
	}

	roles() {
		return this.belongsToMany(Role, "role_user", "user_id", "role_id");
	}

	images() {
		return this.morphMany(Image, "imageable");
	}
}

class Post extends Model<PostAttributes> {
	static override table = "posts";

	user() {
		return this.belongsTo(User, "user_id");
	}

	image() {
		return this.morphOne(Image, "imageable");
	}

	images() {
		return this.morphMany(Image, "imageable");
	}

	latestImage() {
		return this.morphOneOfMany(Image, "imageable");
	}

	tags() {
		return this.morphToMany(
			Tag,
			"taggable",
			"taggables",
			"taggable_id",
			"tag_id",
		);
	}
}

class Profile extends Model<ProfileAttributes> {
	static override table = "profiles";

	user() {
		return this.belongsTo(User, "user_id");
	}
}

class Role extends Model<RoleAttributes> {
	static override table = "roles";
	static override timestamps = false;

	users() {
		return this.belongsToMany(User, "role_user", "role_id", "user_id");
	}
}

class Image extends Model<ImageAttributes> {
	static override table = "images";
	static override timestamps = false;

	imageable() {
		return this.morphTo("imageable");
	}
}

class Tag extends Model<TagAttributes> {
	static override table = "tags";
	static override timestamps = false;

	posts() {
		return this.morphedByMany(
			Post,
			"taggable",
			"taggables",
			"tag_id",
			"taggable_id",
		);
	}
}

class Activity extends Model<ActivityAttributes> {
	static override table = "activities";
	static override timestamps = false;

	subject() {
		return this.morphTo("subject");
	}
}

const config = {
	default: "sqlite",
	connections: {
		sqlite: {
			driver: "sqlite" as const,
			options: {
				adapter: "sqlite",
				filename: ":memory:",
			},
		},
	},
};

describe("Mason ORM", () => {
	let manager: MasonManager;
	let connection: Awaited<ReturnType<DatabaseManager["connection"]>>;

	beforeAll(async () => {
		const database = new DatabaseManager(config);
		manager = new MasonManager(database);
		setMasonResolver(() => manager);
		connection = database.connection();

		await connection`CREATE TABLE countries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`;

		await connection`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    )`;

		await connection`CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    )`;

		await connection`CREATE TABLE profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      bio TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    )`;

		await connection`CREATE TABLE roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`;

		await connection`CREATE TABLE role_user (
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL
    )`;

		await connection`CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`;

		await connection`CREATE TABLE taggables (
      tag_id INTEGER NOT NULL,
      taggable_id INTEGER NOT NULL,
      taggable_type TEXT NOT NULL
    )`;

		await connection`CREATE TABLE images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imageable_id INTEGER NOT NULL,
      imageable_type TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT
    )`;

		await connection`CREATE TABLE activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      subject_type TEXT NOT NULL,
      description TEXT NOT NULL
    )`;

		// Prime morph aliases
		Post.getMorphType();
		User.getMorphType();
		Tag.getMorphType();
		Image.getMorphType();
		Activity.getMorphType();
	});

	beforeEach(async () => {
		await connection`DELETE FROM activities`;
		await connection`DELETE FROM images`;
		await connection`DELETE FROM taggables`;
		await connection`DELETE FROM tags`;
		await connection`DELETE FROM role_user`;
		await connection`DELETE FROM roles`;
		await connection`DELETE FROM posts`;
		await connection`DELETE FROM profiles`;
		await connection`DELETE FROM users`;
		await connection`DELETE FROM countries`;
	});

	test("creates and fetches models via the query builder", async () => {
		const created = await User.create({
			name: "Taylor",
			email: "taylor@example.com",
		});

		expect(created.getAttribute("id")).toBeDefined();

		const fetched = await User.query()
			.where("email", "taylor@example.com")
			.firstOrFail();

		expect(fetched.getAttribute("name")).toBe("Taylor");
		expect(fetched.getAttribute("created_at")).toBeDefined();
	});

	test("hydrates hasMany and belongsTo relationships", async () => {
		const user = await User.create({
			name: "Codey",
			email: "codey@example.com",
		});

		await Post.create({ title: "Hello Mason", user_id: Number(user.getKey()) });
		await Post.create({
			title: "Relationships",
			user_id: Number(user.getKey()),
		});

		const users = await User.query().with("posts").get();
		expect(users).toHaveLength(1);

		const posts = users[0]!.getRelation("posts");
		expect(Array.isArray(posts)).toBe(true);
		expect((posts as Post[]).length).toBe(2);

		const post = await Post.query().with("user").firstOrFail();
		const relatedUser = post.getRelation("user");
		expect(relatedUser).not.toBeNull();
		expect(relatedUser?.getAttribute("email")).toBe("codey@example.com");
	});

	test("supports hasOne eager loading", async () => {
		const user = await User.create({
			name: "Ashley",
			email: "ashley@example.com",
		});

		await Profile.create({
			user_id: Number(user.getKey()),
			bio: "Engineering lead",
		});

		const record = await User.query().with("profile").firstOrFail();
		const profile = record.getRelation("profile");
		expect(profile).not.toBeNull();
		expect(profile?.getAttribute("bio")).toBe("Engineering lead");
	});

	test("retrieves latest related record via hasOneOfMany", async () => {
		const user = await User.create({
			name: "Latest",
			email: "latest@example.com",
		});

		await Post.create({
			title: "Old",
			user_id: Number(user.getKey()),
			created_at: "2020-01-01T00:00:00.000Z",
		});

		await Post.create({
			title: "New",
			user_id: Number(user.getKey()),
			created_at: "2021-01-01T00:00:00.000Z",
		});

		const result = await User.query().with("latestPost").firstOrFail();
		const latest = result.getRelation("latestPost");
		expect(latest?.getAttribute("title")).toBe("New");
	});

	test("resolves hasOneThrough and hasManyThrough relationships", async () => {
		const country = await Country.create({ name: "Canada" });
		const user = await User.create({
			name: "Traveler",
			email: "traveler@example.com",
			country_id: Number(country.getKey()),
		});

		await Profile.create({ user_id: Number(user.getKey()), bio: "Nomad" });
		await Post.create({ title: "Through 1", user_id: Number(user.getKey()) });
		await Post.create({ title: "Through 2", user_id: Number(user.getKey()) });

		const loaded = await Country.query()
			.with(["primaryProfile", "postsThroughUsers"])
			.firstOrFail();

		const profile = loaded.getRelation("primaryProfile");
		expect(profile?.getAttribute("bio")).toBe("Nomad");

		const posts = loaded.getRelation("postsThroughUsers") as Post[];
		expect(posts.length).toBe(2);
	});

	test("loads many-to-many relations with pivot data", async () => {
		const user = await User.create({ name: "Many", email: "many@example.com" });
		const admin = await Role.create({ name: "Admin" });
		const editor = await Role.create({ name: "Editor" });

		await connection`INSERT INTO role_user (user_id, role_id) VALUES (${Number(user.getKey())}, ${Number(admin.getKey())})`;
		await connection`INSERT INTO role_user (user_id, role_id) VALUES (${Number(user.getKey())}, ${Number(editor.getKey())})`;

		const loaded = await User.query().with("roles").firstOrFail();
		const roles = loaded.getRelation("roles") as Role[];
		expect(roles.map((role) => role.getAttribute("name"))).toEqual([
			"Admin",
			"Editor",
		]);

		const pivot = (
			roles[0] as unknown as { getRelation: (key: string) => any }
		).getRelation("pivot");
		expect(pivot.user_id).toBe(Number(user.getKey()));
		expect(pivot.role_id).toBe(Number(admin.getKey()));
	});

	test("handles polymorphic one-to-one and one-to-many relations", async () => {
		const owner = await User.create({
			name: "Poly Owner",
			email: "poly@example.com",
		});
		const post = await Post.create({
			title: "Poly",
			user_id: Number(owner.getKey()),
		});

		await Image.create({
			imageable_id: Number(post.getKey()),
			imageable_type: Post.getMorphType(),
			url: "hero.jpg",
		});

		await Image.create({
			imageable_id: Number(post.getKey()),
			imageable_type: Post.getMorphType(),
			url: "thumb.jpg",
		});

		const loaded = await Post.query()
			.with(["image", "images", "latestImage"])
			.firstOrFail();
		const image = loaded.getRelation("image");
		const images = loaded.getRelation("images") as Image[];
		const latest = loaded.getRelation("latestImage");

		expect(image?.getAttribute("url")).toBe("hero.jpg");
		expect(images.length).toBe(2);
		expect(latest?.getAttribute("url")).toBe("thumb.jpg");

		const morph = await Image.query().with("imageable").firstOrFail();
		expect(morph.getRelation("imageable")?.getAttribute("title")).toBe("Poly");
	});

	test("supports morphTo and morphToMany relations", async () => {
		const author = await User.create({
			name: "Tagger",
			email: "tagger@example.com",
		});
		const post = await Post.create({
			title: "Tagged",
			user_id: Number(author.getKey()),
		});
		const tag = await Tag.create({ name: "Feature" });

		await connection`INSERT INTO taggables (tag_id, taggable_id, taggable_type) VALUES (${Number(tag.getKey())}, ${Number(post.getKey())}, ${Post.getMorphType()})`;

		await Activity.create({
			subject_id: Number(post.getKey()),
			subject_type: Post.getMorphType(),
			description: "Published",
		});

		const postWithTags = await Post.query().with("tags").firstOrFail();
		expect(
			(postWithTags.getRelation("tags") as Tag[])[0]?.getAttribute("name"),
		).toBe("Feature");

		const tagWithPosts = await Tag.query().with("posts").firstOrFail();
		expect(
			(tagWithPosts.getRelation("posts") as Post[])[0]?.getAttribute("title"),
		).toBe("Tagged");

		const activity = await Activity.query().with("subject").firstOrFail();
		expect(activity.getRelation("subject")?.getAttribute("title")).toBe(
			"Tagged",
		);
	});

	test("wraps operations in database transactions", async () => {
		try {
			await manager.transaction(async ({ query }) => {
				await query(User).create({
					name: "Rollback",
					email: "rollback@example.com",
				});

				throw new Error("force rollback");
			});
		} catch (error) {
			expect((error as Error).message).toBe("force rollback");
		}

		const total = await User.query().count();
		expect(total).toBe(0);
	});
});
