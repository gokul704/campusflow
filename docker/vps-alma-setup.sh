#!/usr/bin/env bash
# AlmaLinux 8 / 9 — Docker Engine + Compose plugin, firewalld, optional Nginx + Certbot.
# Run as root:   sudo bash docker/vps-alma-setup.sh
# Options:
#   INSTALL_WEB=1   also install nginx + certbot (for TLS reverse proxy to 127.0.0.1:3000 / :4000)

set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

echo "==> Installing Docker CE repo and packages (AlmaLinux / CentOS-compatible)"
dnf -y install dnf-plugins-core

# Remove podman-docker shim if present — it can shadow the real docker CLI
if rpm -q podman-docker &>/dev/null; then
  dnf -y remove podman-docker || true
fi

dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
docker --version
docker compose version

echo "==> Firewalld: allow SSH, HTTP, HTTPS"
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=ssh
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
else
  echo "firewalld not active; enable it if you use it: systemctl enable --now firewalld"
fi

if [[ "${INSTALL_WEB:-0}" == "1" ]]; then
  echo "==> Installing Nginx + Certbot"
  dnf -y install nginx certbot python3-certbot-nginx
  systemctl enable --now nginx
fi

echo "Done. Next on the VPS:"
echo "  cd /path/to/campusflow"
echo "  cp .env.example .env   # edit secrets + CORS_ORIGINS"
echo "  export NEXT_PUBLIC_API_URL=https://api.YOURDOMAIN"
echo "  export NEXT_PUBLIC_APP_DOMAIN=app.YOURDOMAIN"
echo "  docker compose -f docker-compose.yml -f docker-compose.vps.yml build"
echo "  docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d"
echo "  sudo cp docker/vps.nginx.example.conf /etc/nginx/conf.d/campusflow.conf  # edit server_name"
echo "  sudo certbot --nginx   # after DNS points here"
