import { AxiosInstance } from "axios";
import { unstable_cache } from "next/cache";
import { generateQueryString, generateQueryFromRawString, stringToArray } from "./helpers";
import { StrapiClientHelper } from "./strapi-client-helper";
import { InferredTypeFromArray, PublicationState, StrapiApiResponse } from "./types/base";
import { CrudSorting, PopulateDeepOptions, RelationalFilterOperators } from "./types/crud";

export class StrapiFilterBuilder<T> extends StrapiClientHelper<T> {
  private httpClient: AxiosInstance;
  private normalizeData: boolean;
  private debug: boolean;
  private tags: string[];
  private revalidate: number;
  private isNotUserContent: boolean;

  constructor(
    url: string,
    axiosInstance: AxiosInstance,
    normalizeData: boolean,
    debug: boolean,
    tags: string[],
    revalidate: number,
    isNotUserContent: boolean
  ) {
    super(url);
    this.debug = debug;
    this.url = url;
    this.tags = tags;
    this.revalidate = revalidate;
    this.httpClient = axiosInstance;
    this.normalizeData = normalizeData;
    this.isNotUserContent = isNotUserContent;
  }

  async get(): Promise<StrapiApiResponse<T>> {
    const cache = unstable_cache(
      async () =>
        new Promise<StrapiApiResponse<T>>((resolve) => {
          if (this.isNotUserContent) {
            this.httpClient
              .get<StrapiApiResponse<T>>(this.url)
              .then((res) => {
                resolve(this.normalizeData ? this._returnDataHandler(res.data) : res.data);
              })
              .catch((err) => {
                if (err) {
                  resolve(this._returnErrorHandler(err));
                }
              });
          } else {
            this.httpClient
              .get<T>(this.url)
              .then((res) => {
                resolve({ data: res.data, meta: undefined });
              })
              .catch((err) => {
                if (err) {
                  resolve(this._returnErrorHandler(err));
                }
              });
          }
        }),
      [this.url],
      { revalidate: Boolean(this.tags?.length) ? false : this.revalidate, tags: this.tags }
    );

    const data = await cache();

    if (this.debug) {
      const dataSize = (JSON.stringify(data).length / 1024).toFixed(1);

      const getColor = (size: string) => {
        if (parseFloat(size) < 10) return "\x1b[32m";
        if (parseFloat(size) < 100) return "\x1b[33m";
        if (parseFloat(size) < 250) return "\x1b[93m";
        if (parseFloat(size) < 500) return "\x1b[91m";
        return "\x1b[31m"; // red for large data
      };

      console.log(`${getColor(dataSize)}   [ ${dataSize} kB ] from ${this.url}\x1b[0m`);
    }

    return data;
  }

  setTags(tags: string[]): this {
    this.tags = tags;
    return this;
  }

  setRevalidate(revalidate: number): this {
    this.revalidate = revalidate;
    return this;
  }

  equalTo(field: keyof InferredTypeFromArray<T>, value: string | number) {
    this.url = this._generateFilter({
      field,
      operator: "eq",
      value,
    });
    return this;
  }

  notEqualTo(field: keyof InferredTypeFromArray<T>, value: string | number) {
    this.url = this._generateFilter({
      field,
      operator: "ne",
      value,
    });
    return this;
  }

  lessThan(field: keyof InferredTypeFromArray<T>, value: string | number) {
    this.url = this._generateFilter({
      field,
      operator: "lt",
      value,
    });
    return this;
  }

  lessThanOrEqualTo(field: keyof InferredTypeFromArray<T>, value: string | number) {
    this.url = this._generateFilter({
      field,
      operator: "lte",
      value,
    });
    return this;
  }

  greaterThan(field: keyof InferredTypeFromArray<T>, value: string | number) {
    this.url = this._generateFilter({
      field,
      operator: "gt",
      value,
    });
    return this;
  }

  greaterThanOrEqualTo(field: keyof InferredTypeFromArray<T>, value: string | number) {
    this.url = this._generateFilter({
      field,
      operator: "gte",
      value,
    });
    return this;
  }

  containsCaseSensitive(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "contains",
      value,
    });
    return this;
  }

  notContainsCaseSensitive(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "notContains",
      value,
    });
    return this;
  }

  contains(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "containsi",
      value,
    });
    return this;
  }

  notContains(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "notContainsi",
      value,
    });
    return this;
  }

  isNull(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "null",
      value,
    });
    return this;
  }

  isNotNull(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "notNull",
      value,
    });
    return this;
  }

  between(field: keyof InferredTypeFromArray<T>, value: Array<any>) {
    this.url = this._generateFilter({
      field,
      operator: "between",
      value,
    });
    return this;
  }

  startsWith(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "startsWith",
      value,
    });
    return this;
  }

  endsWith(field: keyof InferredTypeFromArray<T>, value: string) {
    this.url = this._generateFilter({
      field,
      operator: "endsWith",
      value,
    });
    return this;
  }

  /**
   *
   * @param path relation path as string type.  Ex - 'subcategories.products.slug'
   * @param operator "eq" | "ne" | "lt" | "gt" | "lte" | "gte" | "in" | "notIn" | "contains" | "notContains" | "startsWith" | "endsWith"
   * @param value values can be string, number or array
   * @returns
   */
  filterDeep(
    path: string,
    operator: RelationalFilterOperators,
    value: string | number | Array<string | number>
  ) {
    this.url = this._generateRelationsFilter({ path: stringToArray(path), operator, value });
    return this;
  }

  /**
   *
   * @param sort expects an array with the field and order example - [{ field: 'id', order: 'asc' }]
   *
   */
  sortBy(sort: CrudSorting<InferredTypeFromArray<T>>) {
    this.url = this._generateSort(sort);
    return this;
  }

  /**
   *
   * @param page Page number
   * @param pageSize 	Page size
   * @returns Pagination by page
   */
  paginate(page: number, pageSize: number) {
    const paginateRawQuery = `pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    this.url = this._handleUrl(generateQueryFromRawString(paginateRawQuery));
    return this;
  }

  /**
   *
   * @param start Start value (i.e. first entry to return)
   * @param limit Number of entries to return
   * @returns Pagination by offset
   */
  paginateByOffset(start: number, limit: number) {
    const paginateRawQuery = `pagination[start]=${start}&pagination[limit]=${limit}`;
    this.url = this._handleUrl(generateQueryFromRawString(paginateRawQuery));
    return this;
  }

  /**
   *
   * @returns returns both draft entries & published entries
   */
  withDraft() {
    this.url = this._handleUrl(`publicationState=${PublicationState.PREVIEW}`);
    return this;
  }

  /**
   *
   * @returns retrieve only draft entries
   */
  onlyDraft() {
    this.url = this._handleUrl(
      `publicationState=${PublicationState.PREVIEW}&filters[publishedAt][$null]=true`
    );
    return this;
  }

  /**
   *
   * @param localeCode expects string locale-code
   * @returns returns content only for a specified locale
   */
  setLocale(localeCode: string) {
    this.url = this._handleUrl(`locale=${localeCode}`);
    return this;
  }

  /**
   *
   * @returns Populate 1 level for all relations
   */
  populate() {
    const obj = {
      populate: "*",
    };
    this.url = this._handleUrl(generateQueryString(obj));
    return this;
  }

  /**
   * @param key relation name
   * @param selectFields an Array of field names to populate
   * @param level2 expects boolean value to To populate second-level deep for all relations
   */

  populateWith<Q>(
    relation: T extends Array<infer U> ? keyof U : keyof T,
    selectFields?: Array<keyof Q>,
    level2?: boolean
  ) {
    const obj = {
      populate: {
        [relation]: {
          fields: selectFields,
          populate: level2 ? "*" : null,
        },
      },
    };
    this.url = this._handleUrl(generateQueryString(obj));
    return this;
  }

  /**
   *
   * @param populateDeepValues expects an array with the path, fields and children
   * @type path: string
   *
   * @type fields: Array of strings
   *
   * @type children : Array [key:string, fields:Array of strings]

   * @returns Populate n level for the specified relation
   */
  populateDeep(populateDeepValues: PopulateDeepOptions[]) {
    this.url = this._generatePopulateDeep(populateDeepValues);
    return this;
  }
}
