import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';

type PriceType = 'free' | 'paid' | 'unknown';
type CheckStatus = 'open' | 'closed' | 'unknown';
type Cleanliness = 'good' | 'ok' | 'bad';

type Toilet = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  priceType: PriceType;
  is24h: boolean;
  wheelchair: boolean;
  water: boolean;
  babyChanging: boolean;
  lastVerifiedAt: string;
  trustScore: number;
};

type Filters = {
  onlyOpenNow: boolean;
  priceType: PriceType | 'all';
  wheelchair: boolean;
  water: boolean;
  babyChanging: boolean;
};

const now = new Date();
const seedToilets: Toilet[] = [
  {
    id: '1',
    name: 'ปั๊มสุขใจ บางนา',
    category: 'ปั๊ม',
    lat: 13.668,
    lng: 100.613,
    priceType: 'free',
    is24h: true,
    wheelchair: true,
    water: true,
    babyChanging: false,
    lastVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
    trustScore: 92
  },
  {
    id: '2',
    name: 'สวนสุขุมวิท',
    category: 'สวน',
    lat: 13.731,
    lng: 100.569,
    priceType: 'unknown',
    is24h: false,
    wheelchair: false,
    water: true,
    babyChanging: true,
    lastVerifiedAt: new Date(now.getTime() - 1000 * 60 * 60 * 30).toISOString(),
    trustScore: 65
  }
];

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const initialRegion: Region = {
  latitude: 13.736717,
  longitude: 100.523186,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

export default function App() {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [region, setRegion] = useState<Region>(initialRegion);
  const [toilets, setToilets] = useState<Toilet[]>(seedToilets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    onlyOpenNow: false,
    priceType: 'all',
    wheelchair: false,
    water: false,
    babyChanging: false
  });
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('open');
  const [cleanliness, setCleanliness] = useState<Cleanliness>('good');
  const [needCode, setNeedCode] = useState(false);
  const [mustPay, setMustPay] = useState(false);
  const [mustBuy, setMustBuy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('อื่น ๆ');
  const [newPrice, setNewPrice] = useState<PriceType>('unknown');
  const [newOpen, setNewOpen] = useState<CheckStatus>('unknown');
  const [photoAdded, setPhotoAdded] = useState(false);

  const selectedToilet = toilets.find((item) => item.id === selectedId) ?? null;

  const visibleToilets = useMemo(() => {
    return toilets.filter((item) => {
      if (filters.priceType !== 'all' && item.priceType !== filters.priceType) return false;
      if (filters.onlyOpenNow && !item.is24h) return false;
      if (filters.wheelchair && !item.wheelchair) return false;
      if (filters.water && !item.water) return false;
      if (filters.babyChanging && !item.babyChanging) return false;
      return true;
    });
  }, [toilets, filters]);

  const nearestToilet = visibleToilets[0];

  const ensurePermission = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('ต้องการสิทธิ์ตำแหน่ง', 'กรุณาอนุญาต Location เพื่อค้นหาห้องน้ำใกล้คุณ');
        return false;
      }
    }
    return true;
  };

  const goNearMe = async () => {
    const ok = await ensurePermission();
    if (!ok) return;
    const pos = await Location.getCurrentPositionAsync({});
    setRegion({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03
    });
  };

  const emergencyNavigate = () => {
    if (!nearestToilet) {
      Alert.alert('ไม่พบห้องน้ำที่ตรงเงื่อนไข', 'ลองปิดบาง filter แล้วค้นหาใหม่');
      return;
    }
    setSelectedId(nearestToilet.id);
    Alert.alert('ฉุกเฉิน', `แนะนำ: ${nearestToilet.name}\nกด Navigate ด้านล่างเพื่อเปิดแผนที่ภายนอก`);
  };

  const submitCheckIn = () => {
    if (!selectedToilet) return;
    setToilets((prev) =>
      prev.map((item) =>
        item.id === selectedToilet.id
          ? {
              ...item,
              lastVerifiedAt: new Date().toISOString(),
              trustScore: Math.min(100, item.trustScore + 2)
            }
          : item
      )
    );
    setCheckInOpen(false);
    Alert.alert('ขอบคุณ', `อัปเดตแล้ว: ${checkStatus}, ความสะอาด: ${cleanliness}`);
    setNeedCode(false);
    setMustPay(false);
    setMustBuy(false);
  };

  const addToilet = () => {
    if (!newName.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อหรือใส่ "ไม่ทราบชื่อ"');
      return;
    }
    const newItem: Toilet = {
      id: String(Date.now()),
      name: newName,
      category: newCategory,
      lat: region.latitude,
      lng: region.longitude,
      priceType: newPrice,
      is24h: newOpen === 'open',
      wheelchair: false,
      water: true,
      babyChanging: false,
      lastVerifiedAt: new Date().toISOString(),
      trustScore: 25
    };
    setToilets((prev) => [newItem, ...prev]);
    setAddOpen(false);
    setNewName('');
    setPhotoAdded(false);
    Alert.alert('เพิ่มสำเร็จ', 'หมุดใหม่ถูกสร้างแล้ว (สถานะรอยืนยัน)');
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!res.granted) {
      Alert.alert('ต้องการสิทธิ์รูปภาพ', 'โปรดอนุญาตเพื่อแนบภาพยืนยัน');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5
    });
    if (!result.canceled) {
      setPhotoAdded(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>Toil Map</Text>
        <Text style={styles.subtitle}>หาห้องน้ำใกล้สุด + ใช้ได้จริงตอนนี้</Text>
      </View>

      <MapSection
        region={region}
        setRegion={setRegion}
        visibleToilets={visibleToilets}
        onSelect={setSelectedId}
      />

      <View style={styles.actionsRow}>
        <ActionButton label="ใกล้ฉัน" onPress={goNearMe} />
        <ActionButton label="ฉุกเฉิน" onPress={emergencyNavigate} />
        <ActionButton label="Filters" onPress={() => setFilterOpen(true)} />
        <ActionButton label="+ เพิ่ม" onPress={() => setAddOpen(true)} />
      </View>

      <ScrollView style={styles.bottomSheet}>
        <Text style={styles.sectionTitle}>รายการใกล้คุณ</Text>
        {visibleToilets.map((item) => (
          <Pressable key={item.id} style={styles.card} onPress={() => setSelectedId(item.id)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              {item.category} • {item.priceType} • trust {item.trustScore}
            </Text>
            <Text style={styles.cardSub}>ยืนยันล่าสุด: {new Date(item.lastVerifiedAt).toLocaleString()}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedToilet && (
        <View style={styles.detailPanel}>
          <Text style={styles.detailTitle}>{selectedToilet.name}</Text>
          <Text style={styles.detailSub}>
            {selectedToilet.category} • {selectedToilet.priceType} • ยืนยันล่าสุด{' '}
            {new Date(selectedToilet.lastVerifiedAt).toLocaleString()}
          </Text>
          <View style={styles.actionsRow}>
            <ActionButton label="Navigate" onPress={() => Alert.alert('เปิดแผนที่ภายนอก', 'เชื่อม Google/Apple Maps ในสเต็ปถัดไป')} />
            <ActionButton label="Check-in" onPress={() => setCheckInOpen(true)} />
            <ActionButton label="Report" onPress={() => Alert.alert('ขอบคุณ', 'รับเรื่องรายงานแล้วและจะตรวจสอบ')} />
          </View>
        </View>
      )}

      <Modal visible={filterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Filters</Text>
            <ToggleRow label="เปิดอยู่ตอนนี้" value={filters.onlyOpenNow} onValueChange={(value) => setFilters((prev) => ({ ...prev, onlyOpenNow: value }))} />
            <ToggleRow label="Wheelchair" value={filters.wheelchair} onValueChange={(value) => setFilters((prev) => ({ ...prev, wheelchair: value }))} />
            <ToggleRow label="มีน้ำ/สายฉีด" value={filters.water} onValueChange={(value) => setFilters((prev) => ({ ...prev, water: value }))} />
            <ToggleRow
              label="ที่เปลี่ยนผ้าอ้อม"
              value={filters.babyChanging}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, babyChanging: value }))}
            />
            <View style={styles.priceRow}>
              {(['all', 'free', 'paid', 'unknown'] as const).map((price) => (
                <Pressable
                  key={price}
                  style={[styles.pill, filters.priceType === price && styles.pillActive]}
                  onPress={() => setFilters((prev) => ({ ...prev, priceType: price }))}
                >
                  <Text>{price}</Text>
                </Pressable>
              ))}
            </View>
            <ActionButton label="ปิด" onPress={() => setFilterOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={checkInOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Quick Check-in</Text>
            <Text style={styles.cardSub}>สถานะ</Text>
            <View style={styles.priceRow}>
              {(['open', 'closed', 'unknown'] as const).map((status) => (
                <Pressable
                  key={status}
                  style={[styles.pill, checkStatus === status && styles.pillActive]}
                  onPress={() => setCheckStatus(status)}
                >
                  <Text>{status}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.cardSub}>ความสะอาด</Text>
            <View style={styles.priceRow}>
              {(['good', 'ok', 'bad'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.pill, cleanliness === value && styles.pillActive]}
                  onPress={() => setCleanliness(value)}
                >
                  <Text>{value}</Text>
                </Pressable>
              ))}
            </View>
            <ToggleRow label="ต้องขอรหัส" value={needCode} onValueChange={setNeedCode} />
            <ToggleRow label="ต้องซื้อของ" value={mustBuy} onValueChange={setMustBuy} />
            <ToggleRow label="ต้องจ่าย" value={mustPay} onValueChange={setMustPay} />
            <View style={styles.actionsRow}>
              <ActionButton label="ยกเลิก" onPress={() => setCheckInOpen(false)} />
              <ActionButton label="ยืนยัน" onPress={submitCheckIn} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody}>
            <Text style={styles.sectionTitle}>เพิ่มห้องน้ำ (30 วินาที)</Text>
            <TextInput value={newName} onChangeText={setNewName} placeholder="ชื่อหรือไม่ทราบชื่อ" style={styles.input} />
            <TextInput value={newCategory} onChangeText={setNewCategory} placeholder="หมวด เช่น ปั๊ม/ห้าง/สวน" style={styles.input} />
            <Text style={styles.cardSub}>ค่าใช้จ่าย</Text>
            <View style={styles.priceRow}>
              {(['free', 'paid', 'unknown'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.pill, newPrice === value && styles.pillActive]}
                  onPress={() => setNewPrice(value)}
                >
                  <Text>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.cardSub}>เวลาเปิด</Text>
            <View style={styles.priceRow}>
              {(['open', 'closed', 'unknown'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.pill, newOpen === value && styles.pillActive]}
                  onPress={() => setNewOpen(value)}
                >
                  <Text>{value}</Text>
                </Pressable>
              ))}
            </View>
            <ActionButton label={photoAdded ? 'แนบรูปแล้ว ✅' : 'แนบรูป 1 รูป'} onPress={pickPhoto} />
            <View style={styles.actionsRow}>
              <ActionButton label="ยกเลิก" onPress={() => setAddOpen(false)} />
              <ActionButton label="บันทึก" onPress={addToilet} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


function MapSection({
  region,
  setRegion,
  visibleToilets,
  onSelect
}: {
  region: Region;
  setRegion: (region: Region) => void;
  visibleToilets: Toilet[];
  onSelect: (id: string) => void;
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.map, styles.mapWeb]}>
        <Text style={styles.sectionTitle}>Map preview (web)</Text>
        {visibleToilets.map((item) => (
          <Pressable key={item.id} style={styles.card} onPress={() => onSelect(item.id)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              lat/lng: {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  const Maps = require('react-native-maps');
  const MapView = Maps.default;
  const Marker = Maps.Marker;

  return (
    <MapView style={styles.map} region={region} onRegionChangeComplete={setRegion}>
      {visibleToilets.map((item) => (
        <Marker
          key={item.id}
          coordinate={{ latitude: item.lat, longitude: item.lng }}
          title={item.name}
          description={`ยืนยันล่าสุด: ${new Date(item.lastVerifiedAt).toLocaleString()}`}
          pinColor={item.trustScore > 70 ? '#0ea5e9' : '#f59e0b'}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </MapView>
  );
}
function ToggleRow({
  label,
  value,
  onValueChange
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#475569' },
  map: { height: 260, marginHorizontal: 12, borderRadius: 12 },
  mapWeb: { backgroundColor: '#dbeafe', padding: 8 },
  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, flexWrap: 'wrap' },
  button: { backgroundColor: '#0ea5e9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
  bottomSheet: { flex: 1, paddingHorizontal: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#475569', fontSize: 12, marginTop: 4 },
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#e2e8f0',
    paddingVertical: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14
  },
  detailTitle: { fontWeight: '800', fontSize: 16, paddingHorizontal: 12 },
  detailSub: { fontSize: 12, color: '#334155', paddingHorizontal: 12, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalBody: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '86%' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  pill: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillActive: { backgroundColor: '#bae6fd', borderColor: '#0ea5e9' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8
  }
});
