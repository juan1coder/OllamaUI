#!/usr/bin/env bash

# ===================================
# Firewall script to block dev ports
# - Allows loopback traffic (localhost)
# - Blocks Flask ports 5000-5050
# - Blocks Python http.server (8000) and common port 8080
# - Blocks Streamlit ports 8501-8599
# Usage:
#   ./dev-ports-firewall.sh apply   # Add firewall rules
#   ./dev-ports-firewall.sh remove  # Remove firewall rules
# ===================================

# Port ranges and individual ports
FLASK_START=5000
FLASK_END=5050
PORTS=(8000 8080)
STREAMLIT_START=8501
STREAMLIT_END=8599

function apply_rules() {
    echo "🛡️ Applying firewall rules..."

    # Allow all traffic on loopback interface (localhost)
    sudo ufw allow in on lo

    # Block Flask ports range
    for ((p=FLASK_START; p<=FLASK_END; p++)); do
        echo "Blocking Flask port $p"
        sudo ufw deny in from any to any port $p proto tcp
    done

    # Block individual fixed ports (e.g., Python http.server and common web dev)
    for port in "${PORTS[@]}"; do
        echo "Blocking port $port"
        sudo ufw deny in from any to any port $port proto tcp
    done

    # Block Streamlit ports range
    for ((p=STREAMLIT_START; p<=STREAMLIT_END; p++)); do
        echo "Blocking Streamlit port $p"
        sudo ufw deny in from any to any port $p proto tcp
    done

    echo "✅ Firewall rules applied."
    sudo ufw status numbered
}

function remove_rules() {
    echo "🧹 Removing firewall rules..."

    # List numbered UFW rules, find those matching our port ranges/ports and delete
    while read -r line; do
        rule_num=$(echo "$line" | grep -o '^\[[0-9]\+\]' | tr -d '[]')
        port=$(echo "$line" | grep -oP 'port \K[0-9]+')

        if [[ " ${PORTS[*]} " =~ " ${port} " ]] || \
           ([[ $port -ge $FLASK_START ]] && [[ $port -le $FLASK_END ]]) || \
           ([[ $port -ge $STREAMLIT_START ]] && [[ $port -le $STREAMLIT_END ]]); then
            echo "Removing rule #$rule_num blocking port $port"
            sudo ufw delete "$rule_num"
        fi
    done < <(sudo ufw status numbered | grep "DENY IN" | grep -E "port ")

    echo "✅ Firewall rules removed."
    sudo ufw status numbered
}

function usage() {
    echo "Usage: $0 {apply|remove}"
    echo "  apply  - Add firewall rules to block dev ports (5000-5050, 8000, 8080, 8501-8599)"
    echo "  remove - Remove those firewall rules"
    exit 1
}

if [[ $# -ne 1 ]]; then
    usage
fi

case "$1" in
    apply)
        apply_rules
        ;;
    remove)
        remove_rules
        ;;
    *)
        usage
        ;;
esac

