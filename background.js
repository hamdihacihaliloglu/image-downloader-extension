chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    suggest({ filename: `images/${item.filename}` });
  });
  