import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: false
});

const defaultLinkOpen =
  markdown.renderer.rules.link_open ??
  ((
    tokens: MarkdownIt.Token[],
    index: number,
    options: MarkdownIt.Options,
    _env: unknown,
    self: MarkdownIt.Renderer
  ) => self.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (
  tokens: MarkdownIt.Token[],
  index: number,
  options: MarkdownIt.Options,
  env: unknown,
  self: MarkdownIt.Renderer
) => {
  const token = tokens[index];

  token.attrSet("target", "_blank");
  token.attrSet("rel", "noreferrer noopener");

  return defaultLinkOpen(tokens, index, options, env, self);
};

const sanitizeConfig = {
  ALLOWED_TAGS: [
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "h1",
    "h2",
    "h3",
    "li",
    "ol",
    "p",
    "pre",
    "strong",
    "ul"
  ] as string[],
  ALLOWED_ATTR: ["href", "target", "rel", "class"] as string[]
};

export const renderMarkdownToHtml = (markdownText: string) => {
  const rendered = markdown.render(markdownText);
  return DOMPurify.sanitize(rendered, sanitizeConfig);
};
