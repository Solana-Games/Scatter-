function normalizeRegion(region) {
  return typeof region === 'string' && region.trim() ? region.trim().toLowerCase() : 'global';
}

export function buildGatewayPlan({ regions = [], activeSockets = 0, maxSocketsPerGateway = 50_000 }) {
  const normalizedRegions = regions.length ? [...new Set(regions.map(normalizeRegion))] : ['global'];
  const sockets = Math.max(0, Number(activeSockets) || 0);
  const capacity = Math.max(1, Number(maxSocketsPerGateway) || 50_000);
  const requiredGateways = Math.max(1, Math.ceil(sockets / capacity));
  const perRegion = Math.ceil(requiredGateways / normalizedRegions.length);
  return normalizedRegions.map((region) => ({
    region,
    gateways: perRegion,
    estimatedCapacity: perRegion * capacity
  }));
}

export function orchestrateTournamentRooms({ players = [], roomSize = 100 }) {
  const size = Math.max(2, Number(roomSize) || 100);
  const sortedPlayers = [...players]
    .filter((player) => player?.userId)
    .sort((left, right) => (Number(left.latencyMs) || 9999) - (Number(right.latencyMs) || 9999));

  const buckets = new Map();
  for (const player of sortedPlayers) {
    const region = normalizeRegion(player.region);
    if (!buckets.has(region)) buckets.set(region, []);
    buckets.get(region).push(player);
  }

  const rooms = [];
  for (const [region, regionPlayers] of buckets.entries()) {
    for (let index = 0; index < regionPlayers.length; index += size) {
      const roomPlayers = regionPlayers.slice(index, index + size);
      rooms.push({
        roomId: `${region}-room-${Math.floor(index / size) + 1}`,
        region,
        players: roomPlayers.map((player) => player.userId),
        avgLatencyMs: Number(
          (roomPlayers.reduce((sum, player) => sum + Math.max(1, Number(player.latencyMs) || 50), 0) / roomPlayers.length).toFixed(2)
        )
      });
    }
  }
  return rooms;
}

export function websocketFailoverPlan({ nodes = [] }) {
  const activeNodes = nodes.filter((node) => node?.id);
  const healthy = activeNodes.filter((node) => node.status === 'healthy');
  const unhealthy = activeNodes.filter((node) => node.status !== 'healthy');
  const replacement = healthy.slice().sort((a, b) => (Number(b.spareCapacity) || 0) - (Number(a.spareCapacity) || 0));
  return {
    healthyCount: healthy.length,
    unhealthyCount: unhealthy.length,
    failoverTargets: unhealthy.map((node, index) => ({
      from: node.id,
      to: replacement[index % Math.max(1, replacement.length)]?.id ?? null
    }))
  };
}
