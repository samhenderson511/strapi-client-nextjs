# strapi-client-nextjs

This is a fork of strapi-client-nextjs, with caching for nextjs using next/cache.

## Installation

```bash
npm i strapi-client-nextjs axios qs

 or

yarn add strapi-client-nextjs axios qs

```

## Peer Dependencies

This package uses [axios](https://axios-http.com/) as a http client and [qs](https://github.com/ljharb/qs) for parsing and stringifying the query.

### Create Client Options

```ts
// Typescript

import { createClient, StrapiClientOptions } from 'strapi-client-nextjs';

const options: StrapiClientOptions = {
  url: 'http://localhost:1337/api',
  apiToken: '', // Built in API token,
  normalizeData: true, // Normalize Unified response Format. default - true
  headers: {}, // Custom Headers
  persistSession: false, // Persist authenticated token in browser local storage. default -false
  tags: [] // revalidation tags for nextjs
  revalidate: 0 // revalidation timeout for nextjs
};

const strapiClient = createClient(options);
```

# REST API

## Get

```js
import { createClient } from 'strapi-client-nextjs';

const strapiClient = createClient({ url: 'http://localhost:1337/api' });

const run = async () => {
  const { data, error, meta } = await strapiClient
    .from('students')
    // .from<Student>("students") ** typescript **
    .select(['firstname', 'lastname']) // Select only specific fields.
    // .select(["firstname", "lastname"]) ** typescript **
    .get();

  if (error) {
    console.log(error);
  } else {
    console.log(data);
    console.log(meta);
  }
};

run();
```

Retrieve many entries by ids

```ts
const { data, error, meta } = await strapiClient.from('students').selectManyByID([200, 240]).get();
```

### Adding next/cache tags

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select()
  .setTags(['refresh'])
  .get();
```

### Filter Methods

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .equalTo('id', 2)
  .get();
```

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .between('id', [40, 45])
  .get();
```

### All filter Methods

```js
equalTo();
notEqualTo();
lessThan();
lessThanOrEqualTo();
greaterThan();
greaterThanOrEqualTo();
containsCaseSensitive();
notContainsCaseSensitive();
contains();
notContains();
isNull();
isNotNull();
between();
startsWith();
endsWith();
```

### Filter Deep

@param path - as string by relation <br />
@param Operator "eq" | "ne" | "lt" | "gt" | "lte" | "gte" | "in" | "notIn" | "contains" | "notContains" | "startsWith" | "endsWith" <br />
@param values can be string, number or array

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .filterDeep('address.city', 'eq', 'Munich')
  .get();
```

### Sort

Expects an array with the field and order example - [{ field: 'id', order: 'asc' }]

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .between('id', [40, 45])
  .sortBy([{ field: 'id', order: 'desc' }])
  .get();
```

### Publication State

Returns both draft entries & published entries.

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .withDraft()
  .get();
```

Returns only draft entries.

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .onlyDraft()
  .get();
```

### Locale

Get entries from a specific locale.

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .setLocale('de')
  .get();
```

### Pagination

To paginate results by page

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .paginate(1, 15)
  .get();
```

To paginate results by offset

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .paginateByOffset(0, 25)
  .get();
```

### Populate

Populate 1 level for all relations

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .populate()
  .get();
```

Populate 2 levels

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .populateWith<Address>('address', ['id', 'city'], true)
  .get();
```

Populate Deep

```ts
const { data, error, meta } = await strapiClient
  .from<Student>('students')
  .select(['firstname', 'lastname'])
  .populateDeep([
    {
      path: 'address',
      fields: ['id', 'string'],
      children: [{ key: 'country', fields: ['id', 'name'] }],
    },
  ])
  .get();
```

# Post

Create single record

```ts
const { data, error, meta } = await strapiClient
  .from('students')
  .create({ firstname: 'Vorname', lastname: 'Nachname' });
```

Create Many records

```ts
const { success } = await strapiClient.from('students').createMany([
  { firstname: 'muster', lastname: 'muster' },
  { firstname: 'muster1', lastname: 'muster1' },
]);
```

### Available Post Methods

```ts
update();
updateMany();
deleteOne();
deleteMany();
```

# Auth

signup new user

```ts
  const { data, error } = await strapiClient.auth.signUp({
    username: 'username',
    email: 'name@gmail.com',
    password: '12345678',
  });
```

signin user

```ts
  const { data, error } = await strapiClient.auth.signIn({
    email: 'name@gmail.com',
    password: '12345678',
  });
```
signout user - removes the authentication token if saved in localstorage

```ts
  const { error } = await strapiClient.auth.signOut();
```

# Misc

Get url from the client Object

```ts
  const url = strapiClient.getApiUrl();

  console.log(url);

```

Set up revalidation on Strapi

1. Create an API route in your frontend with the following code:

```ts
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const strapiTag = body.model;

  revalidateTag(strapiTag);

  console.log(`Revalidated ${strapiTag}`);
  return Response.json({ revalidated: strapiTag, now: Date.now() });
}
```

2. Set up a webhook in Strapi settings with the API endpoint on the frontend and enable the relevant events.
3. Add plural and singular endpoints as tags in the strapi client requests using the .setTags() method.