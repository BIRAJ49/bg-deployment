#!/usr/bin/env bash
set -euo pipefail
cd /srv/app/nginx
sudo rm -f upstream-current.conf
sudo ln -s /srv/app/nginx/upstream-green.conf /srv/app/nginx/upstream-current.conf
sudo nginx -t && sudo nginx -s reload
