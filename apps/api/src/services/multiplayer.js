export class TournamentRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
  }

  join(userId, score = 0) {
    this.players.set(userId, score);
    return this.players.size;
  }

  submitScore(userId, score) {
    if (!this.players.has(userId)) throw new Error('Player not in room');
    this.players.set(userId, score);
  }

  leaderboard() {
    return [...this.players.entries()]
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);
  }
}

export class TournamentNetwork {
  constructor(roomSize = 100) {
    this.roomSize = Math.max(2, Number(roomSize) || 100);
    this.rooms = new Map();
  }

  assignPlayer({ userId, region = 'global', score = 0 }) {
    if (typeof userId !== 'string' || !userId.trim()) throw new Error('userId is required');
    const normalizedRegion = region.trim().toLowerCase();
    const roomList = this.rooms.get(normalizedRegion) ?? [];
    let room = roomList.find((entry) => entry.players.size < this.roomSize);
    if (!room) {
      room = new TournamentRoom(`${normalizedRegion}-${roomList.length + 1}`);
      roomList.push(room);
      this.rooms.set(normalizedRegion, roomList);
    }
    room.join(userId.trim(), score);
    return { roomId: room.id, region: normalizedRegion, occupancy: room.players.size };
  }

  networkStatus() {
    const regions = {};
    for (const [region, roomList] of this.rooms.entries()) {
      regions[region] = {
        rooms: roomList.length,
        players: roomList.reduce((sum, room) => sum + room.players.size, 0)
      };
    }
    return regions;
  }
}
