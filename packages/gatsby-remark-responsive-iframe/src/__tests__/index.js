const Remark = require(`remark`)
const find = require(`unist-util-find`)
const _ = require(`lodash`)

const plugin = require(`../`)

const remark = new Remark().data(`settings`, {
  commonmark: true,
  footnotes: true,
  pedantic: true
})

const extractObjectTag = mdast =>
  _.reduce(
    mdast.children[0].children,
    (result, child) => result + child.value,
    ``
  )

const extractIframeTag = mdast => mdast.children[0].value

describe(`gatsby-remark-responsive-iframe`, () => {
  ;[`iframe`, `object`].forEach(tag => {
    it(`transforms an ${tag} with unitless width and height`, async () => {
      const markdownAST = remark.parse(`
<${tag} url="http://www.example.com/" width="600" height="400"></${tag}>
    `)

      const transformed = await plugin({ markdownAST })
      const node = find(transformed, function(node) {
        return node.type === `html`
      })
      expect(node).toBeDefined()
      expect(node.value).toMatchSnapshot()
    })
  })
  ;[`iframe`, `object`].forEach(tag => {
    it(`transforms an ${tag} with pixel width and height`, async () => {
      const markdownAST = remark.parse(`
<${tag} url="http://www.example.com/" width="600px" height="400px"></${tag}>
    `)

      const transformed = await plugin({ markdownAST })
      const node = find(transformed, function(node) {
        return node.type === `html`
      })
      expect(node).toBeDefined()
      expect(node.value).toMatchSnapshot()
    })
    it(`transforms an ${tag} and maintains existing styles`, async () => {
      const markdownAST = remark.parse(`
<${tag} url="http://www.example.com/" style="border:0" width="600px" height="400px"></${tag}>
    `)

      const transformed = await plugin({ markdownAST })
      const node = find(transformed, function(node) {
        return node.type === `html`
      })
      expect(node).toBeDefined()
      expect(node.value).toMatchSnapshot()
    })
    it(`transforms an ${tag} and maintains existing styles when a semicolon exists`, async () => {
      const markdownAST = remark.parse(`
<${tag} url="http://www.example.com/" style="border:0;" width="600px" height="400px"></${tag}>
    `)

      const transformed = await plugin({ markdownAST })
      const node = find(transformed, function(node) {
        return node.type === `html`
      })
      expect(node).toBeDefined()
      expect(node.value).toMatchSnapshot()
    })
  })

  it(`can copy JSX images`, async () => {
    const mdx = require(`remark-mdx`)

    const markdownAST = remark().use(mdx).parse(`
<iframe url="http://www.example.com/" style="border:0;" width="600px" height="400px"></iframe>
    `)

    const transformed = await plugin({ markdownAST })
    const node = find(transformed, function(node) {
      return node.type === `html`
    })

    expect(node).toBeDefined()
    expect(node.value).toMatchSnapshot()
  })

  const shouldntTransform = [
    [`100%`, `100`],
    [`100`, `100%`],
    [`invalid`, `100`],
    [`100`, `invalid`]
  ]

  _.map(shouldntTransform, ([width, height]) => {
    ;[`iframe`, `object`].forEach(tag => {
      it(`doesn't transform an ${tag} with dimensions: '${width}' '${height}'`, async () => {
        const markdownAST = remark.parse(`
  <${tag} url="http://www.example.com/" width="${width}" height="${height}"></${tag}>
      `)
        const transformed = await plugin({ markdownAST })
        // Note: Remark treats iframes (block level) and object (inline) tags
        // differently, wrapping an object tag in <p></p> tags. It also parses
        // out the object tag into three separate nodes - one for the opening
        // tag, one for the closing tag and one for a newline inside. So for any
        // tests that receive untransformed node back from the plugin, we strip
        // the p tags and combine the nodes into a single html string.
        if (tag === `iframe`) {
          const iframeHTML = extractIframeTag(transformed)
          expect(iframeHTML).toBeDefined()
          expect(iframeHTML).toMatchSnapshot()
        } else {
          const objectHTML = extractObjectTag(transformed)
          expect(objectHTML).toBeDefined()
          expect(objectHTML).toMatchSnapshot()
        }
      })
    })
  })
})
