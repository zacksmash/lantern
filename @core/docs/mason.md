# Mason ORM

Mason is Lantern’s Eloquent-inspired ORM. Models extend `@core/Mason/Model`, queries flow through a fluent builder, and eager loading works exactly like Laravel’s `with()` API – only fully typed thanks to TypeScript.

```ts
import { Model } from "@core/Mason/Model";

type UserAttributes = {
	id: number;
	name: string;
	email: string;
	created_at?: string;
	updated_at?: string;
};

class User extends Model<UserAttributes> {
	static override table = "users";

	posts() {
		return this.hasMany(Post);
	}
}
```

## Query Builder

Every model exposes a typed builder via `User.query()`. Available helpers mirror Laravel’s documentation (selects, where clauses, pagination-friendly operators, etc.).

```ts
const active = await User.query()
	.select("id", "name")
	.where("email", "like", "%@lantern.dev")
	.orderBy("created_at", "desc")
	.limit(10)
	.get();

const user = await User.query().findOrFail(1);
await user.delete();
```

Builder methods are type-safe. Attempting to `where("unknown", ...)` raises a TypeScript error, and relation names passed into `with()` are autocompleted from the class’ relation methods.

## Relationships

Define relationships by returning a relation instance from a model method, exactly like Eloquent:

```ts
class Post extends Model<PostAttributes> {
	static override table = "posts";

	author() {
		return this.belongsTo(User);
	}

	comments() {
		return this.hasMany(Comment);
	}
}

const posts = await Post.query().with(["author", "comments"]).get();
const author = posts[0]?.getRelation("author"); // typed as User | null
```

Supported relations include the one-to-one basics **and** their Laravel counterparts:

- `hasOne`, `hasMany`, `belongsTo`
- `hasOneOfMany`, `latestOfMany`, `oldestOfMany`
- `hasOneThrough`, `hasManyThrough`
- `belongsToMany`
- Polymorphic cousins (`morphOne`, `morphMany`, `morphOneOfMany`, `morphTo`, `morphToMany`, `morphedByMany`)

```ts
class Country extends Model<CountryAttributes> {
	static override table = "countries";
	static override timestamps = false;

	users() {
		return this.hasMany(User, "country_id");
	}

	posts() {
		return this.hasManyThrough(Post, User, "country_id", "user_id");
	}

	primaryProfile() {
		return this.hasOneThrough(Profile, User, "country_id", "user_id");
	}
}

class User extends Model<UserAttributes> {
	static override table = "users";

	roles() {
		return this.belongsToMany(Role, "role_user");
	}

	latestPost() {
		return this.latestOfMany(Post, "user_id", undefined, "created_at");
	}
}
```

Mason sets timestamps, primary keys, and foreign keys by convention (snake\_case class name + `_id`). Override keys by passing them into the helper if you need something custom.

### Polymorphic Relationships

Polymorphic APIs mirror Laravel as well:

```ts
class Post extends Model<PostAttributes> {
	static override table = "posts";

	image() {
		return this.morphOne(Image, "imageable");
	}

	tags() {
		return this.morphToMany(Tag, "taggable", "taggables");
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
		return this.morphedByMany(Post, "taggable", "taggables");
	}
}
```

- `morphOne` / `morphMany` / `morphOneOfMany` – share the `name` prefix (`imageable` produces `imageable_type` / `imageable_id`).
- `morphTo` loads the parent model; it groups queries per morph type automatically.
- `morphToMany` / `morphedByMany` expect a pivot table (defaulting to the pluralised relation name, e.g. `taggable` → `taggables`).
- `Model.getMorphType()` returns the alias written to the database. By default it’s the snake\_case class name, but you can customise aliases and map them to classes via:

```ts
import { registerMorphMap } from "@core/Mason/MorphMap";

registerMorphMap({
	post: Post,
	user: User,
});
```

Aliases are cached automatically the first time a model calls `Model.getMorphType()`, so manual registration is only needed when you want domain-specific strings (e.g., `"blog_post"` instead of `"post"`).

## Transactions

The `mason()` helper exposes the `MasonManager`, including transactions. You receive a scoped query builder tied to the transaction’s connection:

```ts
await mason().transaction(async ({ query }) => {
	const user = await query(User).create({ name: "Refund", email: "refund@example.com" });
	await query(Invoice)
		.where("user_id", user.getKey())
		.update({ status: "refunded" });
});
```

Throwing inside the callback rolls back the entire unit of work.

## Type Safety & Tooling

- Models carry their attribute shape, so `user.getAttribute("email")` is inferred as `string`.
- Relations derive their names from methods returning `Relation` instances, which powers autocomplete inside `with()`, `load()`, and `getRelation(...)`.
- Mason leans on Lantern’s `DatabaseManager`, so swapping drivers (SQLite, MySQL, PostgreSQL) requires no ORM changes.

See `tests/unit/mason.test.ts` for end-to-end examples that exercise creation, eager loading, and transactions. Pair these docs with Laravel’s relationship guides for the conceptual backdrop – the API reads the same, just in modern TypeScript.
