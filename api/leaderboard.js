import fetch from "node-fetch";

let leaderboardCache = null;
let cacheTime = 0;

export default async function handler(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const playersPerPage = 10;
  const startIndex = (page - 1) * playersPerPage;

  const now = Date.now();
  if (leaderboardCache && now - cacheTime < 300_000) {
    const paginated = leaderboardCache.slice(startIndex, startIndex + playersPerPage);
    return res.status(200).json({ leaderboard: paginated });
  }

  const userIds = Array.from({ length: 100 }, (_, i) => i + 1);
  const leaderboard = [];

  for (const userId of userIds) {
    let totalRAP = 0;

    const inventoryRes = await fetch(`https://reblox.net/apisite/inventory/v1/users/${userId}/assets/collectibles`, {
      headers: { "User-Agent": "RebloxRAPChecker/1.5" },
    });
    const inventoryData = await inventoryRes.json();

    if (inventoryData?.data?.length) {
      for (const item of inventoryData.data) {
        const resaleRes = await fetch(`https://reblox.net/apisite/economy/v1/assets/${item.assetId}/resale-data`, {
          headers: { "User-Agent": "RebloxRAPChecker/1.5" },
        });
        const resaleData = await resaleRes.json();
        if (resaleData?.recentAveragePrice) totalRAP += resaleData.recentAveragePrice;
      }
    }

    const avatarRes = await fetch(`https://reblox.net/apisite/thumbnails/v1/users/avatar?userIds=${userId}&size=100x100&format=png`);
    const avatarData = await avatarRes.json();
    const avatarImage = avatarData?.data?.[0]?.imageUrl ? "https://reblox.net" + avatarData.data[0].imageUrl : null;

    leaderboard.push({ userId, totalRAP, avatar: avatarImage });
    await new Promise(r => setTimeout(r, 200)); // 0.2s delay
  }

  leaderboard.sort((a, b) => b.totalRAP - a.totalRAP);

  leaderboardCache = leaderboard;
  cacheTime = Date.now();

  const paginatedUsers = leaderboard.slice(startIndex, startIndex + playersPerPage);
  res.status(200).json({ leaderboard: paginatedUsers });
}
