// @ts-nocheck

import type { Model } from "@core/Mason/Model";
import type { MasonQueryBuilder } from "@core/Mason/QueryBuilder";
import { Relation } from "@core/Mason/Relation";

export abstract class HasThroughRelation<
	Parent extends Model,
	Related extends typeof Model,
	Through extends typeof Model,
	Result,
> extends Relation<Parent, Related, Result> {
	protected throughDictionary = new Map<unknown, InstanceType<Through>[]>();

	constructor(
		parent: Parent,
		related: Related,
		protected readonly through: Through,
		protected readonly firstKey: string,
		protected readonly secondKey: string,
		protected readonly localKey: string,
		protected readonly secondLocalKey: string,
	) {
		super(parent, related);
	}

	protected async fetchRelated(
		models: Parent[],
		constraint?: (query: MasonQueryBuilder<Related>) => void,
	): Promise<InstanceType<Related>[]> {
		this.throughDictionary = await this.buildThroughDictionary(models);
		const throughKeys = this.collectThroughKeys();

		if (!throughKeys.length) {
			return [];
		}

		const query = this.newRelatedQuery();
		query.whereIn(
			this.secondKey as keyof InstanceType<Related>["$attributes"],
			throughKeys,
		);

		constraint?.(query);
		return query.get();
	}

	override async eagerLoad(
		models: Parent[],
		relation: string,
		constraint?: (query: MasonQueryBuilder<Related>) => void,
	): Promise<void> {
		if (!models.length) return;

		this.initRelation(models, relation);
		const results = await this.fetchRelated(models, constraint);
		this.match(models, results, relation);
	}

	protected async buildThroughDictionary(
		models: Parent[],
	): Promise<Map<unknown, InstanceType<Through>[]>> {
		const parentKeys = models
			.map((model) =>
				model.getAttribute(this.localKey as keyof Parent["$attributes"]),
			)
			.filter((value) => value !== undefined && value !== null);

		if (!parentKeys.length) {
			return new Map();
		}

		const throughModels = await this.through
			.newQuery()
			.whereIn(
				this.firstKey as keyof InstanceType<Through>["$attributes"],
				parentKeys,
			)
			.get();

		const dictionary = new Map<unknown, InstanceType<Through>[]>();

		for (const throughModel of throughModels) {
			const key = throughModel.getAttribute(
				this.firstKey as keyof InstanceType<Through>["$attributes"],
			);

			if (!dictionary.has(key)) {
				dictionary.set(key, []);
			}

			dictionary.get(key)!.push(throughModel);
		}

		return dictionary;
	}

	protected collectThroughKeys(): unknown[] {
		const keys: unknown[] = [];

		for (const throughModels of this.throughDictionary.values()) {
			for (const throughModel of throughModels) {
				const key = throughModel.getAttribute(
					this.secondLocalKey as keyof InstanceType<Through>["$attributes"],
				);
				if (key !== undefined && key !== null) {
					keys.push(key);
				}
			}
		}

		return keys;
	}

	protected buildRelatedDictionary(
		results: InstanceType<Related>[],
	): Map<unknown, InstanceType<Related>[]> {
		const dictionary = new Map<unknown, InstanceType<Related>[]>();

		for (const related of results) {
			const key = related.getAttribute(
				this.secondKey as keyof InstanceType<Related>["$attributes"],
			);

			if (!dictionary.has(key)) {
				dictionary.set(key, []);
			}

			dictionary.get(key)!.push(related);
		}

		return dictionary;
	}

	protected gatherRelatedForModel(
		model: Parent,
		relatedDictionary: Map<unknown, InstanceType<Related>[]>,
	): InstanceType<Related>[] {
		const parentKey = model.getAttribute(
			this.localKey as keyof Parent["$attributes"],
		);

		if (parentKey === undefined || parentKey === null) {
			return [];
		}

		const throughModels = this.throughDictionary.get(parentKey) ?? [];
		const related: InstanceType<Related>[] = [];

		for (const throughModel of throughModels) {
			const throughKey = throughModel.getAttribute(
				this.secondLocalKey as keyof InstanceType<Through>["$attributes"],
			);

			if (throughKey === undefined || throughKey === null) {
				continue;
			}

			const matches = relatedDictionary.get(throughKey) ?? [];
			related.push(...matches);
		}

		return related;
	}
}
