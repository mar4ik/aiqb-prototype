#!/bin/bash
# Double-click in Finder to preview the site at http://localhost:8000/aigraget (close the window to stop).
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
node scripts/serve.mjs 8000
