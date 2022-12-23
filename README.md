# lume_cross_language_content

A [Lume](https://lume.land) post-processor add-on for developing multi-language websites.
Lume is a static-site generator for the [Deno](https://deno.land) JavaScript/TypeScript runtime.

Use lume_cross_language_content for sharing [data](https://lume.land/docs/creating-pages/shared-data/#the-_data-directories) between different language version of your website.

For example, a product page on an e-commerce can show the same price across languages while storing the price information in one single file in a Lume project.

## Usage

Call lume_cross_language_content from your [Lume project's configuration file](https://lume.land/docs/configuration/config-file/):

```ts
// _config.ts

import lume from 'lume/mod.ts';
import * as lume_cross_language_content from 'lume_cross_language_content/mod.ts';

const
src  = './src',
dest = './build';

export default
lume({
  src, dest,
  location: new URL('https://qworum.net'),
})
.addEventListener(
  "afterBuild",
  lume_cross_language_content.createAfterBuildListener(src, dest)
);
```

Don't forget to define the `lume_cross_language_content/` import prefix in your lume project's `import_map.json` file:

```json
{
  "imports": {
    "lume/"                       : "https://deno.land/x/lume@v1.14.2/",
    "lume_cross_language_content/": "https://deno.land/x/lume_cross_language_content@v1.0.4/",
  }
}
```

`lume_cross_language_content@v1.x.x` versions are compatible with `lume@v1.x.x` versions from `lume@v1.13.x` upwards.

## How it works

lume_cross_language_content assumes that your [Lume project's source directory](https://lume.land/docs/configuration/config-file/#src) contains a file that has the path `_data/cross-language-content.yaml`. This file contains data that you wish to define once in your Lume project. Note that this file mustn't contain arrays.

`cross-language-content.yaml` file contents look like this:

```yaml
currency: USD
plans:
  basic:
    monthly_fee: 195
    yearly_fee: 1950
```

Here are the rules for this file:

- Literals can be strings or numbers, both floating point and integer numbers are supported.
- No arrays.

Your project [pages](https://lume.land/docs/creating-pages/page-files/) can then access this data using the `§§{path.to.literal}` placeholder format.

lume_cross_language_content will then modify the HTML pages after they have been built by Lume, and will not touch the Lume pages in the source directory.

In other words, lume_cross_language_content is a post-build tool. Note that the local Lume server must be restarted if the `_data/cross-language-content.yaml` file is modified.

### Example

Here is what a Lume page might look like in YAML format:

```yaml
layout: layouts/pricing.njk
title: Plans

plans: 
- title   : Basic
  price   : §§{plans.basic.monthly_fee} §§{currency} per month or §§{plans.basic.yearly_fee} §§{currency} per year. 
```

This page is already localised because it targets the english language, but we can do even better.

Note that the price itself isn't localised, so let's use the page's layout for localising the price as well. This will happen at the expense of additional code. Here is what an improved Lume page would look like:

```yaml
layout: layouts/pricing.njk
title: Plans

plans: 
- title   : Basic
  price   : >
    <span class='price' data-amount='§§{plans.basic.monthly_fee}' data-currency='§§{currency}'></span> per month or 

    <span class='price' data-amount='§§{plans.basic.yearly_fee}' data-currency='§§{currency}'></span> per year.
```

Given this page, the `layouts/pricing.njk` Lume layout can then localise the price using JavaScript.

Note that the `<span>` elements have no content yet, so users would only be able to see the prices if they have enabled JavaScript on their browsers. Adding support for browsers that have disabled JavaScript is possible, although the displayed price will not be localised:

```yaml
layout: layouts/pricing.njk
title: Plans

plans: 
- title   : Basic
  price   : >
    <span class='price' data-amount='§§{plans.basic.monthly_fee}' data-currency='§§{currency}'>
      §§{plans.basic.monthly_fee} §§{currency}
    </span> per month or 

    <span class='price' data-amount='§§{plans.basic.yearly_fee}' data-currency='§§{currency}'>
      §§{plans.basic.yearly_fee} §§{currency}
    </span> per year.
```

Finally, here is the `layouts/pricing.njk` Lume layout that adds the final touch in the localisation process:

```html
<!DOCTYPE html>
<html lang="{{ lang.code }}">
<head>
  <!-- … -->
</head>
<body>
  <!-- … -->
  <ul>
    {% for plan in plans %}
    <li>
      <p>{{ plan.title }}</p>
      <p>{{ plan.price | safe }}</p>
    </li>
    {% endfor %}
  </ul>
  <!-- … -->
  <script>
    const lang = document.documentElement.lang;

    document.querySelectorAll("span.price")
    .forEach(priceElement => {
      const
      amount    = parseFloat(priceElement.dataset.amount),
      currency  = priceElement.dataset.currency,
      priceHtml = new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount);

      priceElement.innerHTML = priceHtml;
    });
  </script>
  <!-- … -->
</body>
</html>
```

In this example the page's language code is added by the [lume_langdata](https://deno.land/x/lume_langdata) Lume plugin at build time.

## Other relevant Lume add-ons

If you are developing multi-language sites, the following Lume plugins are a nice complement to the lume_cross_language_content add-on:

- [lume_langdata](https://deno.land/x/lume_langdata)
- [lume_navbardata](https://deno.land/x/lume_navbardata)

## Demo

[This website project](https://github.com/doga/qworum-website) uses Lume and lume_cross_language_content.

## License

lume_cross_language_content is released under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0).
