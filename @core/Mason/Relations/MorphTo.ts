// @ts-nocheck

import { Model } from "@core/Mason/Model";
import { resolveMorphClass } from "@core/Mason/MorphMap";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { Relation } from "@core/Mason/Relation";

type MorphGroup = {
	models: Model[];
	ids: Set<unknown>;
};

export class MorphToRelation<Parent extends Model> extends Relation<
	Parent,
	typeof Model,
	Model | null
> {
	constructor(
		parent: Parent,
		readonly _name: string,
		private readonly typeColumn: string,
		private readonly idColumn: string,
	) {
		super(parent, Model);
	}

	async getResults(): Promise<Model | null> {
		const { type, id } = this.getMorphValues(this.parent);
		if (!type || id === undefined || id === null) {
			return null;
		}

		const related = resolveMorphClass(type);
		if (!related) {
			return null;
		}

		return related
			.newQuery()
			.where(
				related.primaryKey as keyof InstanceType<typeof related>["$attributes"],
				id,
			)
			.first();
	}

	initRelation(models: Parent[], relation: string): void {
		for (const model of models) {
			model.setRelation(relation, null);
		}
	}

	override async eagerLoad(
		models: Parent[],
		relation: string,
		constraint?: (query: MasonQueryBuilder<any>) => void,
	): Promise<void> {
		if (!models.length) return;

		this.initRelation(models, relation);
		const groups = this.groupModelsByType(models);

		for (const [related, group] of groups.entries()) {
			if (!group.ids.size) continue;

			const query = related.newQuery();
			query.whereIn(
				related.primaryKey as keyof InstanceType<typeof related>["$attributes"],
				Array.from(group.ids),
			);

			constraint?.(query);

			const results = await query.get();
			const dictionary = new Map<unknown, InstanceType<typeof related>>();
			for (const result of results) {
				const key = result.getAttribute(
					related.primaryKey as keyof InstanceType<
						typeof related
					>["$attributes"],
				);
				if (key !== undefined && key !== null) {
					dictionary.set(key, result);
				}
			}

			for (const model of group.models) {
				const id = model.getAttribute(
					this.idColumn as keyof Parent["$attributes"],
				);
				model.setRelation(
					relation,
					(id !== undefined && id !== null ? dictionary.get(id) : null) ?? null,
				);
			}
		}
	}

	private getMorphValues(model: Parent) {
		const type = model.getAttribute(
			this.typeColumn as keyof Parent["$attributes"],
		) as string | undefined;
		const id = model.getAttribute(this.idColumn as keyof Parent["$attributes"]);
		return { type, id };
	}

	private groupModelsByType(models: Parent[]) {
		const groups = new Map<typeof Model, MorphGroup>();

		for (const model of models) {
			const { type, id } = this.getMorphValues(model);
			if (!type || id === undefined || id === null) continue;

			const related = resolveMorphClass(type);
			if (!related) continue;

			if (!groups.has(related)) {
				groups.set(related, { models: [], ids: new Set() });
			}

			const group = groups.get(related)!;
			group.models.push(model);
			group.ids.add(id);
		}

		return groups;
	}
}
