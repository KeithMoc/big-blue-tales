#!/usr/bin/env sh
# Gathers the playable site into _site/ (no docs/, tools/ or repo notes). One list, used by every host:
# GitHub Pages (.github/workflows/pages.yml), or any static host. No build step: the site is the files.
set -eu
rm -rf _site
mkdir _site
cp -r index.html app.js animals core fonts kit scenes sounds ui vendor views LICENSE NOTICE.md _site/
touch _site/.nojekyll
