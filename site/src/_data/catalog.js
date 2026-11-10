// Слой данных каталога. В MODX его заменят msProducts / pdoMenu с теми же полями:
// category.{path,url,title,lead,children,tabs,products,count,parent}, product.{url,title,vendor,availability,...}
import fs from "node:fs";

const read = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), "utf8"));

export default function () {
  const tree = read("./catalogTree.json");
  const products = read("./products.json").map((p) => ({
    ...p,
    url: `/katalog/${p.category}/${p.slug}/`,
    oldUrl: p.oldPath ? `/katalog/${p.oldPath}/${p.slug}` : null,
    cardSpecs: p.specs.filter((s) => s.card).slice(0, 3),
  }));

  const under = (path) => products.filter((p) => p.category === path || p.category.startsWith(path + "/"));
  const flat = [];

  const decorate = (node, parent) => {
    const c = {
      ...node,
      url: `/katalog/${node.path}/`,
      parent: parent ? { title: parent.title, url: `/katalog/${parent.path}/`, path: parent.path } : null,
      products: under(node.path),
    };
    c.count = c.products.length;
    c.vendors = [...new Set(c.products.map((p) => p.vendor))].sort();
    c.children = (node.children || []).map((ch) => decorate(ch, node));
    flat.push(c);
    return c;
  };
  const roots = tree.map((n) => decorate(n, null));

  // вкладки: у раздела — его подразделы, у подраздела — подразделы родителя
  for (const c of flat) {
    const owner = c.parent ? flat.find((x) => x.path === c.parent.path) : c;
    c.tabs = owner.children.map((x) => ({ title: x.title, url: x.url, count: x.count, current: x.path === c.path }));
    c.root = owner;
  }

  for (const p of products) {
    const cat = flat.find((c) => c.path === p.category);
    p.categoryTitle = cat?.title;
    p.trail = [];
    let cur = cat;
    while (cur) {
      p.trail.unshift({ title: cur.title, url: cur.url });
      cur = cur.parent ? flat.find((x) => x.path === cur.parent.path) : null;
    }
    p.related = under(p.category).filter((x) => x.slug !== p.slug).slice(0, 4);
  }

  return {
    roots,
    flat,
    products,
    popular: products.filter((p) => p.popular).slice(0, 10),
    redirects: products.filter((p) => p.oldUrl).map((p) => ({ from: p.oldUrl, to: p.url })),
  };
}
