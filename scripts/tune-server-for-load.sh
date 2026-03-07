#!/bin/bash
# Server tuning for high-concurrency load (2000+ jobfair attendees)
# Run as root on the server (liv) before load testing
#
# These settings address:
# - nf_conntrack exhaustion (Docker NAT)
# - TCP backlog (somaxconn)
# - Ephemeral port range (if k6 runs on same server)
# - TIME_WAIT reuse

set -e

echo "=== Server tuning for high load ==="

# 1. Connection tracking (critical for Docker port forwarding)
# Each connection through Docker NAT uses a conntrack entry
# Default 65536 can be exhausted at ~900+ concurrent connections
if [ -f /proc/sys/net/netfilter/nf_conntrack_max ]; then
  echo "Setting nf_conntrack_max..."
  sysctl -w net.netfilter.nf_conntrack_max=262144
  sysctl -w net.netfilter.nf_conntrack_buckets=65536
  sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=86400
  sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30
else
  echo "nf_conntrack not loaded (no iptables/nftables). Skipping."
fi

# 2. TCP listen backlog
sysctl -w net.core.somaxconn=65535

# 3. TCP tuning for high connection churn
sysctl -w net.ipv4.tcp_tw_reuse=1
sysctl -w net.ipv4.tcp_timestamps=1
sysctl -w net.ipv4.tcp_fin_timeout=15

# 4. Ephemeral port range (if k6 runs on THIS server)
sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# 5. Increase max file descriptors system-wide (for all processes)
sysctl -w fs.file-max=2097152

echo ""
echo "=== Current values ==="
sysctl net.core.somaxconn net.ipv4.tcp_tw_reuse net.ipv4.ip_local_port_range 2>/dev/null || true
[ -f /proc/sys/net/netfilter/nf_conntrack_max ] && sysctl net.netfilter.nf_conntrack_max 2>/dev/null || true

echo ""
echo "=== To make permanent, add to /etc/sysctl.d/99-load-test.conf ==="
cat << 'EOF'
# High-concurrency load tuning
net.core.somaxconn=65535
net.ipv4.tcp_tw_reuse=1
net.ipv4.tcp_timestamps=1
net.ipv4.tcp_fin_timeout=15
net.ipv4.ip_local_port_range=1024 65535
fs.file-max=2097152
# If nf_conntrack is loaded:
net.netfilter.nf_conntrack_max=262144
net.netfilter.nf_conntrack_buckets=65536
net.netfilter.nf_conntrack_tcp_timeout_established=86400
net.netfilter.nf_conntrack_tcp_timeout_time_wait=30
EOF

echo ""
echo "Done. Run 'sysctl -p /etc/sysctl.d/99-load-test.conf' after creating the file."
