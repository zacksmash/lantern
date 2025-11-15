// @ts-nocheck
import type { MasonTransactionContext } from "@core/Mason/MasonManager";
import { resolveMorphType } from "@core/Mason/MorphMap";
import { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { Relation } from "@core/Mason/Relation";
import { BelongsToRelation } from "@core/Mason/Relations/BelongsTo";
import { BelongsToManyRelation } from "@core/Mason/Relations/BelongsToMany";
import { HasManyRelation } from "@core/Mason/Relations/HasMany";
import { HasManyThroughRelation } from "@core/Mason/Relations/HasManyThrough";
import { HasOneRelation } from "@core/Mason/Relations/HasOne";
import {
	type HasOneOfManyOptions,
	HasOneOfManyRelation,
} from "@core/Mason/Relations/HasOneOfMany";
import { HasOneThroughRelation } from "@core/Mason/Relations/HasOneThrough";
import { MorphManyRelation } from "@core/Mason/Relations/MorphMany";
import { MorphOneRelation } from "@core/Mason/Relations/MorphOne";
import {
	type MorphOneOfManyOptions,
	MorphOneOfManyRelation,
} from "@core/Mason/Relations/MorphOneOfMany";
import { MorphToRelation } from "@core/Mason/Relations/MorphTo";
import { MorphToManyRelation } from "@core/Mason/Relations/MorphToMany";
import { getMasonManager } from "@core/Mason/Resolver";
import { snakeCase } from "@core/Mason/utils";
import type { SQL } from "bun";

export type ModelAttributes = Record<string, unknown>;

export type AttributesOf<M extends typeof Model> =
	InstanceType<M>["$attributes"];

type ModelConstructor<M extends typeof Model> = new (
	attributes?: Partial<AttributesOf<M>>,
	exists?: boolean,
) => InstanceType<M>;

export abstract class Model<
	Attributes extends ModelAttributes = Record<string, unknown>,
> {
	declare $attributes: Attributes;
	declare $relations: Record<string, unknown>;

	static table: string;
	static primaryKey = "id";
	static connection?: string;
	static timestamps = true;
	static createdAtColumn = "created_at";
	static updatedAtColumn = "updated_at";
	static morphClass?: string;

	protected attributes: Attributes;
	protected original: Attributes;
	protected exists: boolean;
	private relationValues = new Map<string, unknown>();

	constructor(attributes: Partial<Attributes> = {}, exists = false) {
		this.attributes = { ...(attributes as Attributes) };
		this.original = { ...this.attributes };
		this.exists = exists;
	}

	static query<M extends typeof Model>(
		this: M,
		connection?: SQL,
	): MasonQueryBuilder<M> {
		return Model.newQuery(connection);
	}

	static newQuery<M extends typeof Model>(
		this: M,
		connection?: SQL,
	): MasonQueryBuilder<M> {
		const manager = getMasonManager();
		return new MasonQueryBuilder(Model, manager, connection);
	}

	static resolveConnection(connection?: SQL) {
		return getMasonManager().connectionFor(Model, connection);
	}

	static getMorphType(): string {
		return resolveMorphType(Model);
	}

	static async transaction<T>(
		callback: (trx: MasonTransactionContext) => Promise<T> | T,
		connectionName?: string,
	): Promise<T> {
		const manager = getMasonManager();
		return manager.transaction(callback, connectionName);
	}

	static async all<M extends typeof Model>(this: M) {
		return Model.newQuery().get();
	}

	static async find<M extends typeof Model>(
		this: M,
		key: unknown,
	): Promise<InstanceType<M> | null> {
		return Model.newQuery().whereKey(key).first();
	}

	static async findOrFail<M extends typeof Model>(
		this: M,
		key: unknown,
	): Promise<InstanceType<M>> {
		const model = await Model.find(key);
		if (!model) {
			throw new Error(
				`${Model.name || "Model"} with primary key "${String(key)}" not found.`,
			);
		}
		return model;
	}

	static async create<M extends typeof Model>(
		this: M,
		attributes: Partial<AttributesOf<M>>,
	): Promise<InstanceType<M>> {
		return Model.newQuery().create(attributes);
	}

	static hydrate<M extends typeof Model>(
		this: M,
		rows: Partial<AttributesOf<M>>[],
	): InstanceType<M>[] {
		return rows.map((row) => Model.newInstance(row, true));
	}

	static newInstance<M extends typeof Model>(
		this: M,
		attributes: Partial<AttributesOf<M>> = {},
		exists = false,
	): InstanceType<M> {
		const Ctor = Model as unknown as ModelConstructor<M>;
		return new Ctor(attributes, exists);
	}

	static relationInstance(
		this: typeof Model,
		name: string,
		model?: InstanceType<any>,
	): Relation<any, any, any> {
		const instance = model ?? Model.newInstance();
		return instance.getRelationInstance(name);
	}

	getTable(): string {
		return (this.constructor as typeof Model).getTable();
	}

	static getTable(): string {
		if (!Model.table) {
			throw new Error(
				`Model "${Model.name}" is missing a static "table" property.`,
			);
		}
		return Model.table;
	}

	getConnection(): SQL {
		return (this.constructor as typeof Model).resolveConnection();
	}

	getKeyName(): string {
		return (this.constructor as typeof Model).primaryKey;
	}

	getKey(): unknown {
		const key = this.getKeyName() as keyof Attributes;
		return this.attributes[key];
	}

	getKeyForSave(): unknown {
		return this.getKey();
	}

	setKey(value: unknown) {
		const key = this.getKeyName() as keyof Attributes;
		(this.attributes as Record<string, unknown>)[key as string] = value;
	}

	fill(attributes: Partial<Attributes>): this {
		Object.assign(this.attributes, attributes);
		return this;
	}

	forceFill(attributes: Partial<Attributes>): this {
		return this.fill(attributes);
	}

	getAttribute<K extends keyof Attributes>(key: K): Attributes[K] | undefined {
		return this.attributes[key];
	}

	setAttribute<K extends keyof Attributes>(key: K, value: Attributes[K]): this {
		this.attributes[key] = value;
		return this;
	}

	getAttributes(): Attributes {
		return { ...this.attributes };
	}

	getOriginal(): Attributes {
		return { ...this.original };
	}

	getDirty(): Partial<Attributes> {
		const dirty: Partial<Attributes> = {};

		for (const key of Object.keys(this.attributes) as (keyof Attributes)[]) {
			if (this.attributes[key] !== this.original[key]) {
				dirty[key] = this.attributes[key];
			}
		}

		return dirty;
	}

	isDirty(): boolean {
		return Object.keys(this.getDirty()).length > 0;
	}

	markClean(): void {
		this.original = { ...this.attributes };
	}

	replicate(): this {
		const ctor = this.constructor as typeof Model;
		const clone = ctor.newInstance(this.getAttributes(), this.exists) as this;
		clone.markClean();
		return clone;
	}

	protected usesTimestamps(): boolean {
		return (this.constructor as typeof Model).timestamps;
	}

	protected getCreatedAtColumn(): string {
		return (this.constructor as typeof Model).createdAtColumn;
	}

	protected getUpdatedAtColumn(): string {
		return (this.constructor as typeof Model).updatedAtColumn;
	}

	protected freshTimestamp(): string {
		return new Date().toISOString();
	}

	protected touchTimestamps(): void {
		if (!this.usesTimestamps()) return;

		const timestamp = this.freshTimestamp();
		this.setAttribute(
			this.getUpdatedAtColumn() as keyof Attributes,
			timestamp as Attributes[keyof Attributes],
		);

		if (!this.exists) {
			this.setAttribute(
				this.getCreatedAtColumn() as keyof Attributes,
				timestamp as Attributes[keyof Attributes],
			);
		}
	}

	async save(): Promise<this> {
		this.touchTimestamps();
		const dirty = this.getDirty();

		if (!this.exists) {
			const model = await (this.constructor as typeof Model)
				.newQuery()
				.create(this.attributes);

			this.attributes = model.getAttributes() as Attributes;
			this.exists = true;
			this.markClean();
			return this;
		}

		if (Object.keys(dirty).length === 0) {
			return this;
		}

		await (this.constructor as typeof Model)
			.newQuery()
			.whereKey(this.getKey())
			.update(dirty);

		this.markClean();
		return this;
	}

	async delete(): Promise<void> {
		if (!this.exists) return;

		await (this.constructor as typeof Model)
			.newQuery()
			.whereKey(this.getKey())
			.delete();

		this.exists = false;
	}

	async refresh(): Promise<this> {
		if (!this.exists) return this;

		const fresh = await (this.constructor as typeof Model)
			.newQuery()
			.whereKey(this.getKey())
			.first();

		if (!fresh) {
			throw new Error("Unable to refresh model; record no longer exists.");
		}

		this.attributes = fresh.getAttributes() as Attributes;
		this.markClean();
		this.relationValues.clear();
		return this;
	}

	protected getRelationInstance(name: string): Relation<this, any, any> {
		const relationMethod = (this as Record<string, unknown>)[name];

		if (typeof relationMethod !== "function") {
			throw new Error(
				`Relation "${String(name)}" is not defined on ${this.constructor.name}.`,
			);
		}

		const relation = relationMethod.call(this);

		if (!(relation instanceof Relation)) {
			throw new Error(
				`Relation "${String(name)}" must return a Mason Relation instance.`,
			);
		}

		return relation as Relation<this, any, any>;
	}

	setRelation(name: string, value: unknown): this {
		this.relationValues.set(name as string, value);
		return this;
	}

	getRelation<T>(name: string): T | undefined {
		return this.relationValues.get(name as string) as T | undefined;
	}

	hasRelationLoaded(name: string): boolean {
		return this.relationValues.has(name);
	}

	async load(...relations: string[]): Promise<this> {
		for (const relation of relations) {
			await this.loadRelationByName(relation);
		}

		return this;
	}

	private async loadRelationByName(relation: string) {
		const relationInstance = this.getRelationInstance(relation);
		const results = await relationInstance.getResults();
		this.setRelation(relation, results);
	}

	toJSON(): Record<string, unknown> {
		const json: Record<string, unknown> = { ...this.attributes };

		for (const [key, value] of this.relationValues.entries()) {
			json[key] = Array.isArray(value)
				? value.map((entry) =>
						entry instanceof Model ? entry.toJSON() : entry,
					)
				: value instanceof Model
					? value.toJSON()
					: value;
		}

		return json;
	}

	protected getForeignKey(): string {
		const name = this.constructor.name || "model";
		return `${snakeCase(name)}_${this.getKeyName()}`;
	}

	protected getForeignKeyNameFor(model: typeof Model, key: string): string {
		const name = model.name || "model";
		return `${snakeCase(name)}_${key}`;
	}

	protected getMorphTypeColumn(name: string, custom?: string) {
		return custom ?? `${name}_type`;
	}

	protected getMorphIdColumn(name: string, custom?: string) {
		return custom ?? `${name}_id`;
	}

	protected hasOne<Related extends typeof Model>(
		related: Related,
		foreignKey?: string,
		localKey?: string,
	): HasOneRelation<this, Related> {
		return new HasOneRelation(
			this,
			related,
			foreignKey ?? this.getForeignKey(),
			localKey ?? this.getKeyName(),
		);
	}

	protected hasMany<Related extends typeof Model>(
		related: Related,
		foreignKey?: string,
		localKey?: string,
	): HasManyRelation<this, Related> {
		return new HasManyRelation(
			this,
			related,
			foreignKey ?? this.getForeignKey(),
			localKey ?? this.getKeyName(),
		);
	}

	protected belongsTo<Related extends typeof Model>(
		related: Related,
		foreignKey?: string,
		ownerKey?: string,
	): BelongsToRelation<this, Related> {
		return new BelongsToRelation(
			this,
			related,
			foreignKey ?? this.getForeignKeyNameFor(related, related.primaryKey),
			ownerKey ?? related.primaryKey,
		);
	}

	protected hasOneOfMany<Related extends typeof Model>(
		related: Related,
		foreignKey?: string,
		localKey?: string,
		options?: HasOneOfManyOptions<Related>,
	): HasOneOfManyRelation<this, Related> {
		return new HasOneOfManyRelation(
			this,
			related,
			foreignKey ?? this.getForeignKey(),
			localKey ?? this.getKeyName(),
			options,
		);
	}

	protected latestOfMany<Related extends typeof Model>(
		related: Related,
		foreignKey?: string,
		localKey?: string,
		column?: keyof InstanceType<Related>["$attributes"] & string,
	): HasOneOfManyRelation<this, Related> {
		return this.hasOneOfMany(related, foreignKey, localKey, {
			orderColumn: column,
			orderDirection: "desc",
		});
	}

	protected oldestOfMany<Related extends typeof Model>(
		related: Related,
		foreignKey?: string,
		localKey?: string,
		column?: keyof InstanceType<Related>["$attributes"] & string,
	): HasOneOfManyRelation<this, Related> {
		return this.hasOneOfMany(related, foreignKey, localKey, {
			orderColumn: column,
			orderDirection: "asc",
		});
	}

	protected hasOneThrough<
		Related extends typeof Model,
		Through extends typeof Model,
	>(
		related: Related,
		through: Through,
		firstKey?: string,
		secondKey?: string,
		localKey?: string,
		secondLocalKey?: string,
	): HasOneThroughRelation<this, Related, Through> {
		const parent = this.constructor as typeof Model;
		return new HasOneThroughRelation(
			this,
			related,
			through,
			firstKey ?? this.getForeignKeyNameFor(parent, parent.primaryKey),
			secondKey ?? this.getForeignKeyNameFor(through, through.primaryKey),
			localKey ?? this.getKeyName(),
			secondLocalKey ?? through.primaryKey,
		);
	}

	protected hasManyThrough<
		Related extends typeof Model,
		Through extends typeof Model,
	>(
		related: Related,
		through: Through,
		firstKey?: string,
		secondKey?: string,
		localKey?: string,
		secondLocalKey?: string,
	): HasManyThroughRelation<this, Related, Through> {
		const parent = this.constructor as typeof Model;
		return new HasManyThroughRelation(
			this,
			related,
			through,
			firstKey ?? this.getForeignKeyNameFor(parent, parent.primaryKey),
			secondKey ?? this.getForeignKeyNameFor(through, through.primaryKey),
			localKey ?? this.getKeyName(),
			secondLocalKey ?? through.primaryKey,
		);
	}

	protected belongsToMany<Related extends typeof Model>(
		related: Related,
		table: string,
		foreignPivotKey?: string,
		relatedPivotKey?: string,
		parentKey?: string,
		relatedKey?: string,
	): BelongsToManyRelation<this, Related> {
		const parent = this.constructor as typeof Model;
		return new BelongsToManyRelation(
			this,
			related,
			table,
			foreignPivotKey ?? this.getForeignKeyNameFor(parent, parent.primaryKey),
			relatedPivotKey ?? this.getForeignKeyNameFor(related, related.primaryKey),
			parentKey ?? this.getKeyName(),
			relatedKey ?? related.primaryKey,
		);
	}

	protected morphOne<Related extends typeof Model>(
		related: Related,
		name: string,
		typeColumn?: string,
		idColumn?: string,
		localKey?: string,
	): MorphOneRelation<this, Related> {
		return new MorphOneRelation(
			this,
			related,
			this.getMorphTypeColumn(name, typeColumn),
			this.getMorphIdColumn(name, idColumn),
			localKey ?? this.getKeyName(),
		);
	}

	protected morphMany<Related extends typeof Model>(
		related: Related,
		name: string,
		typeColumn?: string,
		idColumn?: string,
		localKey?: string,
	): MorphManyRelation<this, Related> {
		return new MorphManyRelation(
			this,
			related,
			this.getMorphTypeColumn(name, typeColumn),
			this.getMorphIdColumn(name, idColumn),
			localKey ?? this.getKeyName(),
		);
	}

	protected morphOneOfMany<Related extends typeof Model>(
		related: Related,
		name: string,
		typeColumn?: string,
		idColumn?: string,
		localKey?: string,
		options?: MorphOneOfManyOptions<Related>,
	): MorphOneOfManyRelation<this, Related> {
		return new MorphOneOfManyRelation(
			this,
			related,
			this.getMorphTypeColumn(name, typeColumn),
			this.getMorphIdColumn(name, idColumn),
			localKey ?? this.getKeyName(),
			options,
		);
	}

	protected morphTo(
		name: string,
		typeColumn?: string,
		idColumn?: string,
	): MorphToRelation<this> {
		return new MorphToRelation(
			this,
			name,
			this.getMorphTypeColumn(name, typeColumn),
			this.getMorphIdColumn(name, idColumn),
		);
	}

	protected morphToMany<Related extends typeof Model>(
		related: Related,
		name: string,
		table?: string,
		foreignPivotKey?: string,
		relatedPivotKey?: string,
		parentKey?: string,
		relatedKey?: string,
		typeColumn?: string,
	): MorphToManyRelation<this, Related> {
		const parent = this.constructor as typeof Model;
		return new MorphToManyRelation(
			this,
			related,
			table ?? `${snakeCase(name)}s`,
			foreignPivotKey ?? this.getMorphIdColumn(name),
			relatedPivotKey ?? this.getForeignKeyNameFor(related, related.primaryKey),
			parentKey ?? this.getKeyName(),
			relatedKey ?? related.primaryKey,
			this.getMorphTypeColumn(name, typeColumn),
			parent.getMorphType(),
		);
	}

	protected morphedByMany<Related extends typeof Model>(
		related: Related,
		name: string,
		table?: string,
		foreignPivotKey?: string,
		relatedPivotKey?: string,
		parentKey?: string,
		relatedKey?: string,
		typeColumn?: string,
	): MorphToManyRelation<this, Related> {
		const parent = this.constructor as typeof Model;
		return new MorphToManyRelation(
			this,
			related,
			table ?? `${snakeCase(name)}s`,
			foreignPivotKey ?? this.getForeignKeyNameFor(parent, parent.primaryKey),
			relatedPivotKey ?? this.getMorphIdColumn(name),
			parentKey ?? this.getKeyName(),
			relatedKey ?? related.primaryKey,
			this.getMorphTypeColumn(name, typeColumn),
			related.getMorphType(),
		);
	}
}
