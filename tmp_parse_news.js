const fetch = globalThis.fetch;
const JINA_BASE = 'https://r.jina.ai/';
function getSourceHost(feedUrl) {
  try {
    return new URL(feedUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}
function parseJinaMarkdown(text, feedUrl) {
  const contentMatch = text.match(/Markdown Content:\s*([\s\S]*)$/i);
  const body = contentMatch ? contentMatch[1].trim() : text;
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let current = null;

  for (const line of lines) {
    const linkMatch = line.match(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
    const headingMatch = line.match(/^###\s*\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
    const dateMatch = line.match(/^(?:[A-Za-z]{3,},\s*\d{1,2}.+GMT|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$/);

    if (headingMatch) {
      if (current && current.link) {
        items.push(current);
      }
      let title = headingMatch[1] || '';
      if (!title) {
        try {
          const parsed = new URL(headingMatch[2]);
          const parts = parsed.pathname.split('/').filter(Boolean);
          title = parts.pop()?.replace(/[-_]/g, ' ') || getSourceHost(feedUrl);
        } catch {
          title = getSourceHost(feedUrl);
        }
      }
      current = {
        title,
        link: headingMatch[2],
        description: '',
        date: '',
        source: getSourceHost(feedUrl),
      };
      continue;
    }
    if (linkMatch) {
      const [, textLink, url] = linkMatch;
      if (!current || current.link === url) {
        if (!current) {
          current = {
            title: textLink || getSourceHost(feedUrl),
            link: url,
            description: '',
            date: '',
            source: getSourceHost(feedUrl),
          };
        } else if (!current.title) {
          current.title = textLink || current.title || getSourceHost(feedUrl);
        }
      } else {
        if (current.link) {
          items.push(current);
        }
        current = {
          title: textLink || getSourceHost(feedUrl),
          link: url,
          description: '',
          date: '',
          source: getSourceHost(feedUrl),
        };
      }
      continue;
    }
    if (dateMatch && current) {
      current.date = line;
      continue;
    }
    if (current && !current.description) {
      current.description = line;
    }
  }
  if (current && current.link) {
    items.push(current);
  }
  return items;
}
(async () => {
  const feeds = ['https://www.bbc.com/ukrainian/index.xml','https://espreso.tv/rss'];
  for (const feed of feeds) {
    const url = JINA_BASE + feed;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    console.log('FEED', feed, 'status', res.status, 'len', text.length);
    console.log(text.slice(0,600).replace(/\n/g,'\\n'));
    const items = parseJinaMarkdown(text, feed);
    console.log('PARSED', items.length);
    console.log(items.slice(0,3));
    console.log('-----');
  }
})();
