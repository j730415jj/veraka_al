import React, { useEffect, useState, useRef } from 'react';
import { Vehicle } from '../types';
import { supabase } from '../supabase'; // 👇 DB 연동을 위해 추가

// Leaflet CDN 스타일 및 스크립트 로드를 위한 유틸리티 (기존 유지)
const loadLeaflet = () => {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).L) {
      resolve();
      return;
    }
    
    const timeout = setTimeout(() => reject(new Error('지도 라이브러리 로드 시간 초과')), 10000);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('지도 라이브러리(Leaflet)를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });
};

interface Props {
  vehicles: Vehicle[];
}

const VehicleTrackingView: React.FC<Props> = ({ vehicles }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  
  // 초기 데이터를 props로 받아 설정
  const [activeVehicles, setActiveVehicles] = useState<Vehicle[]>(vehicles);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 위치 유효성 검사 유틸리티
  const isValidLocation = (lat?: number, lng?: number): boolean => {
    if (lat === undefined || lng === undefined) return false;
    if (isNaN(lat) || isNaN(lng)) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // 👇 [수정됨] 기존 랜덤 시뮬레이션 제거 -> Supabase 실시간 구독으로 변경
  useEffect(() => {
    // 1. 초기 데이터 동기화
    setActiveVehicles(vehicles);

    console.log("📡 실시간 관제 모드 시작: 데이터 수신 대기중...");

    // 2. Supabase Realtime 설정
    const channel = supabase
      .channel('vehicle-tracking-map')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vehicles' },
        (payload) => {
          const updatedData = payload.new as Vehicle;
          
          // 상태 업데이트 (지도 마커가 자동으로 반응함)
          setActiveVehicles(prev => 
            prev.map(v => v.id === updatedData.id ? { ...v, ...updatedData } : v)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicles]); // vehicles prop이 바뀔 때마다 재설정

  // 지도 초기화 (기존 유지)
  useEffect(() => {
    loadLeaflet()
      .then(() => {
        if (!mapRef.current || leafletMap.current) return;

        try {
          const L = (window as any).L;
          const initialLat = 36.019; // 포항 기준
          const initialLng = 129.343;
          
          leafletMap.current = L.map(mapRef.current, {
            zoomControl: true,
            scrollWheelZoom: true,
            zoomAnimation: true,
            markerZoomAnimation: true,
            fadeAnimation: true,
            zoomSnap: 0.1,
            zoomDelta: 1
          }).setView([initialLat, initialLng], 12);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(leafletMap.current);

          const validLocations = vehicles
            .filter(v => isValidLocation(v.lat, v.lng))
            .map(v => [v.lat!, v.lng!]);

          if (validLocations.length > 0) {
            const bounds = L.latLngBounds(validLocations);
            leafletMap.current.fitBounds(bounds, { padding: [50, 50], animate: true });
          }
        } catch (err) {
          console.error('지도 설정 오류:', err);
          setLoadError('지도를 초기화하는 중 오류가 발생했습니다.');
        }
      })
      .catch((err) => {
        setLoadError(err.message || '지도 서비스를 불러올 수 없습니다.');
      });
  }, []); // 최초 1회만 실행

  // 마커 업데이트 (기존 유지 - activeVehicles가 바뀌면 자동으로 실행됨)
  useEffect(() => {
    if (!leafletMap.current || !(window as any).L) return;
    const L = (window as any).L;

    activeVehicles.forEach(vehicle => {
      if (!isValidLocation(vehicle.lat, vehicle.lng)) {
        const oldMarker = markersRef.current.get(vehicle.id);
        if (oldMarker) {
          oldMarker.remove();
          markersRef.current.delete(vehicle.id);
        }
        return;
      }

      try {
        let marker = markersRef.current.get(vehicle.id);
        const isSelected = selectedVehicleId === vehicle.id;
        const statusColor = vehicle.status === 'active' ? '#16a34a' : vehicle.status === 'idle' ? '#ea580c' : '#dc2626';
        
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="marker-container ${vehicle.status} ${isSelected ? 'selected' : ''}" style="background-color: ${statusColor}; border-color: ${isSelected ? '#3b82f6' : 'white'};">
              <span class="marker-number">${vehicle.vehicleNo}</span>
              <div class="marker-tip" style="border-top-color: ${isSelected ? '#3b82f6' : statusColor};"></div>
              ${vehicle.status === 'active' ? `<div class="marker-pulse" style="border-color: ${statusColor};"></div>` : ''}
            </div>
          `,
          iconSize: [60, 30],
          iconAnchor: [30, 35]
        });

        if (marker) {
          // 기존 마커 위치 이동 (부드러운 이동은 CSS transition 처리됨)
          marker.setLatLng([vehicle.lat, vehicle.lng]);
          marker.setIcon(icon);
          marker.setZIndexOffset(isSelected ? 1000 : 0);
        } else {
          // 새 마커 생성
          marker = L.marker([vehicle.lat, vehicle.lng], { 
            icon,
            riseOnHover: true 
          }).addTo(leafletMap.current);
          
          marker.bindPopup(`<strong>${vehicle.vehicleNo}</strong><br>차주: ${vehicle.ownerName}<br>상태: ${vehicle.status === 'active' ? '운행중' : '대기중'}`);
          marker.on('click', () => setSelectedVehicleId(vehicle.id));
          markersRef.current.set(vehicle.id, marker);
        }
      } catch (err) {
        console.warn(`차량(${vehicle.vehicleNo}) 마커 업데이트 중 오류 발생:`, err);
      }
    });
  }, [activeVehicles, selectedVehicleId]);

  const handleVehicleClick = (v: Vehicle) => {
    if (!isValidLocation(v.lat, v.lng)) {
      alert(`${v.vehicleNo} 차량의 현재 위치 정보를 확인할 수 없습니다.`);
      return;
    }
    setSelectedVehicleId(v.id);
    if (leafletMap.current && v.lat && v.lng) {
      leafletMap.current.flyTo([v.lat, v.lng], 15, {
        animate: true,
        duration: 1.5
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col no-print">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-700 flex items-center">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            실시간 차량 상태 

[Image of GPS Tracking on Map]

          </h3>
          <span className="text-[10px] text-gray-400 font-medium tracking-tighter">Realtime</span>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {activeVehicles.map(v => {
            const hasLocation = isValidLocation(v.lat, v.lng);
            return (
              <button
                key={v.id}
                onClick={() => handleVehicleClick(v)}
                className={`w-full text-left p-4 border-b border-gray-50 hover:bg-blue-50 transition-all duration-300 relative ${selectedVehicleId === v.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''} ${!hasLocation ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-black text-gray-800 text-sm">{v.vehicleNo}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    v.status === 'active' ? 'bg-green-100 text-green-700' : 
                    v.status === 'idle' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {v.status === 'active' ? '운행중' : v.status === 'idle' ? '대기중' : '정비중'}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-gray-500">
                    <span className="block text-[9px] text-gray-400 font-medium">차주</span>
                    {v.ownerName}
                  </div>
                  <div className="text-gray-500 text-right">
                    <span className="block text-[9px] text-gray-400 font-medium">상태</span>
                    {!hasLocation ? (
                      <span className="text-red-500 font-bold">위치정보 없음</span>
                    ) : (
                      <span className={v.status === 'active' ? 'text-blue-600 font-bold' : ''}>
                        {v.status === 'active' ? '이동중' : '정차중'}
                      </span>
                    )}
                  </div>
                </div>
                {v.status === 'active' && hasLocation && (
                  <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
        {loadError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <svg className="w-16 h-16 text-red-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <h4 className="text-lg font-bold text-gray-700 mb-2">지도를 불러올 수 없습니다</h4>
            <p className="text-gray-500 text-sm mb-6">{loadError}</p>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">새로고침</button>
          </div>
        ) : (
          <>
            <div ref={mapRef} className="w-full h-full z-0"></div>
            <div className="absolute top-4 right-4 z-10 space-y-2">
              <div className="bg-white/95 backdrop-blur-md p-3 rounded-lg shadow-lg border border-gray-200 text-[11px] font-bold text-gray-700 min-w-[140px]">
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-600 mr-2 shadow-sm"></div> 운행 중: {activeVehicles.filter(v => v.status === 'active' && isValidLocation(v.lat, v.lng)).length}
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-3 h-3 rounded-full bg-orange-600 mr-2 shadow-sm"></div> 대기 중: {activeVehicles.filter(v => v.status === 'idle' && isValidLocation(v.lat, v.lng)).length}
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-600 mr-2 shadow-sm"></div> 정비 중: {activeVehicles.filter(v => v.status === 'maintenance' && isValidLocation(v.lat, v.lng)).length}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                  <button 
                    onClick={() => {
                      if (leafletMap.current) {
                        const validCoords = activeVehicles
                          .filter(v => isValidLocation(v.lat, v.lng))
                          .map(v => [(window as any).L.latLng(v.lat, v.lng)]);
                        if (validCoords.length > 0) {
                          leafletMap.current.flyToBounds((window as any).L.latLngBounds(validCoords), { padding: [50, 50], duration: 1.5 });
                        }
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 transition font-black flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    전체 차량 보기
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <style>{`
          .custom-marker { background: none !important; border: none !important; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .marker-container {
            position: relative;
            width: 60px;
            height: 30px;
            border-radius: 6px;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 10;
            transition: all 0.3s ease;
          }
          .marker-container.selected {
            width: 70px;
            height: 35px;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 8px 16px rgba(0,0,0,0.3);
            transform: translateY(-5px);
            z-index: 1000 !important;
          }
          .marker-number {
            color: white;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            letter-spacing: -0.5px;
            pointer-events: none;
          }
          .marker-container.selected .marker-number {
            font-size: 13px;
          }
          .marker-tip {
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid white;
          }
          .marker-pulse {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70px;
            height: 40px;
            border-radius: 8px;
            border: 2px solid;
            animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
            pointer-events: none;
            opacity: 0;
          }
          @keyframes pulse-ring {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
            80%, 100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
          }
          .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; margin: 20px !important; border-radius: 8px !important; overflow: hidden; }
          .leaflet-control-zoom-in, .leaflet-control-zoom-out { background: white !important; color: #374151 !important; font-weight: bold !important; border: none !important; }
          .leaflet-container { background: #f8fafc !important; }
        `}</style>
      </div>
    </div>
  );
};

export default VehicleTrackingView;