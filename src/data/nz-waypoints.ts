/** 紐西蘭路線 GPS 航點（從 KiwiCanyons topo 資料整理）
 *  key = PocketBase canyon_routes.id
 *  ponytail: 靜態資料，待路線有 gpx_waypoints 欄位後可移除
 */
export interface NzWaypoint {
  lab: string; // 中文標籤
  en: string; // 說明
  lat: number;
  lon: number;
  side: "l" | "r"; // 地圖標籤靠左或靠右
}
