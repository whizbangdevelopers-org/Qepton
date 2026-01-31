#!/usr/bin/env bash
# test-all-vms.sh - Run all VM tests against configured VMs
#
# Configure VM IPs/hostnames in ~/.config/qepton/vms.env or pass as arguments.
#
# Usage:
#   ./scripts/test-all-vms.sh <version>
#   ./scripts/test-all-vms.sh <version> --parallel
#   ./scripts/test-all-vms.sh <version> --only fedora,arch

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Arguments
VERSION="${1:-}"
shift || true

PARALLEL=false
ONLY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel|-p)
            PARALLEL=true
            shift
            ;;
        --only|-o)
            ONLY="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

usage() {
    echo "Usage: $0 <version> [options]"
    echo ""
    echo "Options:"
    echo "  --parallel, -p     Run tests in parallel (background jobs)"
    echo "  --only, -o LIST    Only test specified VMs (comma-separated)"
    echo "                     Valid: fedora, arch, debian, appimage"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.12                      # Test all VMs sequentially"
    echo "  $0 1.0.12 --parallel           # Test all VMs in parallel"
    echo "  $0 1.0.12 --only fedora,arch   # Test only Fedora and Arch"
    echo ""
    echo "VM Configuration:"
    echo "  Create ~/.config/qepton/vms.env with:"
    echo "    FEDORA_VM=192.168.122.100"
    echo "    ARCH_VM=192.168.122.101"
    echo "    DEBIAN_VM=192.168.122.102"
    echo "    APPIMAGE_VM=192.168.122.100  # Can be any Linux VM"
    echo ""
    echo "  Or set environment variables before running."
    exit 1
}

log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
}

warn() {
    echo -e "${YELLOW}!${NC} $1"
}

header() {
    echo ""
    echo -e "${CYAN}=======================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo ""
}

# Validate version
if [ -z "$VERSION" ]; then
    usage
fi

# Load VM configuration
if [ -f ~/.config/qepton/vms.env ]; then
    source ~/.config/qepton/vms.env
    log "Loaded VM config from ~/.config/qepton/vms.env"
fi

# Default to empty if not configured
FEDORA_VM="${FEDORA_VM:-}"
ARCH_VM="${ARCH_VM:-}"
DEBIAN_VM="${DEBIAN_VM:-}"
APPIMAGE_VM="${APPIMAGE_VM:-$FEDORA_VM}"  # Default to Fedora VM for AppImage

# Check what's configured
declare -A VM_HOSTS=(
    ["fedora"]="$FEDORA_VM"
    ["arch"]="$ARCH_VM"
    ["debian"]="$DEBIAN_VM"
    ["appimage"]="$APPIMAGE_VM"
)

declare -A VM_SCRIPTS=(
    ["fedora"]="test-fedora-vm.sh"
    ["arch"]="test-arch-vm.sh"
    ["debian"]="test-debian-vm.sh"
    ["appimage"]="test-appimage-vm.sh"
)

# Determine which VMs to test
if [ -n "$ONLY" ]; then
    IFS=',' read -ra TEST_VMS <<< "$ONLY"
else
    TEST_VMS=(fedora arch debian appimage)
fi

# Track results
declare -A RESULTS

header "Qepton v${VERSION} VM Testing"

echo "VMs to test:"
for vm in "${TEST_VMS[@]}"; do
    host="${VM_HOSTS[$vm]}"
    if [ -n "$host" ]; then
        echo "  - $vm: $host"
    else
        echo "  - $vm: (not configured)"
    fi
done
echo ""

if [ "$PARALLEL" = true ]; then
    log "Running tests in parallel..."
else
    log "Running tests sequentially..."
fi

# Run tests
PIDS=()
LOG_DIR="/tmp/qepton-vm-tests-$$"
mkdir -p "$LOG_DIR"

for vm in "${TEST_VMS[@]}"; do
    host="${VM_HOSTS[$vm]}"
    script="${VM_SCRIPTS[$vm]}"

    if [ -z "$host" ]; then
        warn "Skipping $vm (not configured)"
        RESULTS[$vm]="SKIPPED"
        continue
    fi

    if [ ! -x "${SCRIPT_DIR}/${script}" ]; then
        warn "Skipping $vm (script not found: ${script})"
        RESULTS[$vm]="SKIPPED"
        continue
    fi

    if [ "$PARALLEL" = true ]; then
        log "Starting $vm tests in background..."
        "${SCRIPT_DIR}/${script}" "$host" "$VERSION" > "${LOG_DIR}/${vm}.log" 2>&1 &
        PIDS+=($!)
        # Store PID to VM mapping
        eval "PID_VM_$!=$vm"
    else
        header "Testing $vm ($host)"
        if "${SCRIPT_DIR}/${script}" "$host" "$VERSION"; then
            RESULTS[$vm]="PASS"
            success "$vm tests passed"
        else
            RESULTS[$vm]="FAIL"
            fail "$vm tests failed"
        fi
    fi
done

# Wait for parallel jobs
if [ "$PARALLEL" = true ] && [ ${#PIDS[@]} -gt 0 ]; then
    log "Waiting for parallel tests to complete..."
    echo ""

    for pid in "${PIDS[@]}"; do
        vm_var="PID_VM_$pid"
        vm="${!vm_var}"

        if wait "$pid"; then
            RESULTS[$vm]="PASS"
            success "$vm tests passed"
        else
            RESULTS[$vm]="FAIL"
            fail "$vm tests failed"
        fi

        # Show summary from log
        if [ -f "${LOG_DIR}/${vm}.log" ]; then
            echo "  Log: ${LOG_DIR}/${vm}.log"
        fi
    done
fi

# Summary
header "Test Summary"

echo "Version: ${VERSION}"
echo ""
printf "%-12s %-15s %s\n" "VM" "Host" "Result"
printf "%-12s %-15s %s\n" "---" "----" "------"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

for vm in "${TEST_VMS[@]}"; do
    host="${VM_HOSTS[$vm]:-'(none)'}"
    result="${RESULTS[$vm]:-UNKNOWN}"

    case "$result" in
        PASS)
            color=$GREEN
            ((PASS_COUNT++))
            ;;
        FAIL)
            color=$RED
            ((FAIL_COUNT++))
            ;;
        SKIPPED)
            color=$YELLOW
            ((SKIP_COUNT++))
            ;;
        *)
            color=$NC
            ;;
    esac

    printf "%-12s %-15s ${color}%s${NC}\n" "$vm" "$host" "$result"
done

echo ""
echo "Passed: $PASS_COUNT | Failed: $FAIL_COUNT | Skipped: $SKIP_COUNT"

if [ "$PARALLEL" = true ]; then
    echo ""
    echo "Logs saved to: ${LOG_DIR}/"
fi

# Exit with failure if any tests failed
if [ $FAIL_COUNT -gt 0 ]; then
    exit 1
fi
