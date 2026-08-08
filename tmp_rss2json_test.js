(async () => {
  const feeds = [
    'https://www.bbc.com/ukrainian/index.xml',
    'https://espreso.tv/rss',
    'https://www.pravda.com.ua/rss/'
  ];

  for (const feed of feeds) {
    const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = await res.text();
      console.log('FEED', feed, 'status', res.status, 'len', text.length);
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.error('PARSE ERROR', parseErr.message);
        console.log(text.slice(0, 500));
        continue;
      }
      console.log(' status', json.status, 'items', json.items?.length, 'feedTitle', json.feed?.title);
      console.log(' first', JSON.stringify(json.items?.slice(0, 1), null, 2));
      console.log('---');
    } catch (err) {
      console.error('ERR', feed, err.message);
    }
  }
})();
