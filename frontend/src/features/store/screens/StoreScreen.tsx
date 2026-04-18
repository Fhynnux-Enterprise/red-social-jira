import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Animated, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_STORE_PRODUCTS, GET_MY_STORE_PRODUCTS, DELETE_STORE_PRODUCT } from '../graphql/store.operations';
import StoreProductCard from '../components/StoreProductCard';
import CreateProductModal from '../components/CreateProductModal';
import CommentsModal from '../../comments/components/CommentsModal';
import ListFooter from '../../../components/ListFooter';
import PostOptionsModal from '../../feed/components/PostOptionsModal';
import Toast from 'react-native-toast-message';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

type TabKey = 'all' | 'mine';

const TABS: TabConfig[] = [
  { key: 'all',  label: 'Todos',        icon: 'storefront-outline', iconActive: 'storefront' },
  { key: 'mine', label: 'Mis Productos', icon: 'bag-outline',        iconActive: 'bag' },
];



export default function StoreScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [createVisible, setCreateVisible] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // ── Comments Modal State ──
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<any>(null);

  // ── Tab indicator animado ──
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const [tabOffsets, setTabOffsets] = useState<number[]>([]);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const handleTabPress = (key: TabKey, index: number) => {
    setActiveTab(key);
    if (tabOffsets[index] !== undefined && tabWidths[index] !== undefined) {
      Animated.spring(indicatorAnim, {
        toValue: tabOffsets[index],
        useNativeDriver: false,
        tension: 68,
        friction: 10,
      }).start();
      Animated.spring(indicatorWidth, {
        toValue: tabWidths[index],
        useNativeDriver: false,
        tension: 68,
        friction: 10,
      }).start();
    }
  };

  const handleTabLayout = (index: number, width: number, x: number) => {
    setTabWidths(prev => { const n = [...prev]; n[index] = width; return n; });
    setTabOffsets(prev => { const n = [...prev]; n[index] = x; return n; });
    if (index === 0) {
      indicatorAnim.setValue(x);
      indicatorWidth.setValue(width);
    }
  };

  const { data: allData, loading: loadingAll, refetch: refetchAll } = useQuery(GET_STORE_PRODUCTS, {
    variables: { limit: 30, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: mineData, loading: loadingMine, refetch: refetchMine } = useQuery(GET_MY_STORE_PRODUCTS, {
    fetchPolicy: 'cache-and-network',
  });

  const products = activeTab === 'all' ? (allData?.storeProducts ?? []) : (mineData?.myStoreProducts ?? []);
  const loading = activeTab === 'all' ? loadingAll : loadingMine;

  const commentsModalData = React.useMemo(() => {
      if (!selectedPostForComments) return { post: null, nextPost: null, prevPost: null };
      
      const currentIndex = products.findIndex((p: any) => p.id === selectedPostForComments.post?.id);
      const livePost = currentIndex !== -1 ? products[currentIndex] : selectedPostForComments.post;

      let nextPost = null;
      if (currentIndex !== -1 && currentIndex < products.length - 1) {
          nextPost = { ...products[currentIndex + 1] };
      }

      let prevPost = null;
      if (currentIndex > 0) {
          prevPost = { ...products[currentIndex - 1] };
      }

      return {
          post: { ...livePost, __typename: livePost.__typename || 'StoreProduct' },
          nextPost,
          prevPost,
      };
  }, [selectedPostForComments, products]);

  const toggleFab = () => {
    if (fabOpen) {
      Animated.timing(fabAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(fabAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 8,
        speed: 14,
      }).start();
    }
    setFabOpen(!fabOpen);
  };

  const handleOpenCreate = () => {
    setEditItem(null);
    setFabOpen(false);
    Animated.timing(fabAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    setCreateVisible(true);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    // Ya no cerramos el CommentsModal aquí
    setCreateVisible(true);
  };

  const [deleteProduct] = useMutation(DELETE_STORE_PRODUCT, {
    onCompleted: () => {
      setIsOptionsVisible(false);
      Toast.show({ type: 'success', text1: 'Producto eliminado' });
      refetchAll();
      refetchMine();
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    }
  });

  const handleOptionsPress = (product: any) => {
    setSelectedProductForOptions(product);
    setIsOptionsVisible(true);
  };

  const handleCloseModal = () => {
    setCreateVisible(false);
    setEditItem(null);
    refetchAll();
    refetchMine();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.06)' }]}>
        <Ionicons name="storefront-outline" size={44} color="#FF6524" style={{ opacity: 0.7 }} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {activeTab === 'all' ? 'No hay productos aún' : 'No has publicado nada'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {activeTab === 'all'
          ? 'Sé el primero en publicar un producto en la tienda.'
          : 'Toca el botón + para publicar tu primer producto.'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tienda</Text>
        </View>

        {/* ── Tab bar ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.key, i)}
                activeOpacity={0.7}
                onLayout={e => {
                  const { width, x } = e.nativeEvent.layout;
                  handleTabLayout(i, width, x);
                }}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={18}
                  color={isActive ? '#FF6524' : colors.textSecondary}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? '#FF6524' : colors.textSecondary },
                  isActive && styles.tabLabelActive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Animated underline indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              { left: indicatorAnim, width: indicatorWidth },
            ]}
          />
        </View>
      </View>

      {/* ── CONTENT ── */}
      {loading && products.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF6524" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoreProductCard
              item={item}
              cardWidth={undefined}
              onEdit={handleEdit}
              onPress={() => setSelectedPostForComments({ post: item, minimize: true, initialTab: 'comments' })}
              onCommentPress={() => setSelectedPostForComments({ post: item, minimize: false, initialTab: 'comments' })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={products.length > 0 ? <ListFooter /> : null}
          onRefresh={() => { refetchAll(); refetchMine(); }}
          refreshing={loading}
        />
      )}

      {/* ── FAB Overlay (cierra el menú al tocar fuera) ── */}
      {fabOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={toggleFab}
        />
      )}

      {/* ── FAB Speed-Dial ── */}
      <View
        style={[styles.fabContainer, { bottom: insets.bottom + -35 }]}
        pointerEvents="box-none"
      >
        {/* Opciones animadas sobre el FAB */}
        <Animated.View
          style={{
            opacity: fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
            transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0], extrapolate: 'clamp' }) }],
            alignItems: 'flex-end',
            gap: 12,
            marginBottom: 14,
            marginRight: 6,
          }}
          pointerEvents={fabOpen ? 'auto' : 'none'}
        >
          {/* Opción: Publicar Producto */}
          <TouchableOpacity
            style={styles.fabOptionRow}
            onPress={handleOpenCreate}
            activeOpacity={0.8}
          >
            <View style={[styles.fabOptionLabelWrap, styles.fabOptionLabelActive]}>
              <Text style={[styles.fabOptionLabel, { color: '#FFF' }]}>
                Publicar Producto
              </Text>
            </View>
            <View style={[styles.fabMini, styles.fabMiniPrimary]}>
              <Ionicons name="storefront-outline" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Botón principal FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={toggleFab}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Animated.View style={{
              transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }]
            }}>
              <Ionicons name="add" size={30} color="#FFF" />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── MODAL ── */}
      <CreateProductModal
        visible={createVisible}
        onClose={handleCloseModal}
        editItem={editItem}
      />

      {/* ── Comments Modal ── */}
      <CommentsModal
        visible={!!selectedPostForComments}
        post={commentsModalData.post}
        onClose={() => setSelectedPostForComments(null)}
        initialMinimized={selectedPostForComments?.minimize ?? false}
        initialTab={selectedPostForComments?.initialTab ?? 'comments'}
        onNextPost={() => {
            if (commentsModalData.nextPost) {
                setSelectedPostForComments((prev: any) => ({ ...prev, post: commentsModalData.nextPost }));
            }
        }}
        onPrevPost={() => {
            if (commentsModalData.prevPost) {
                setSelectedPostForComments((prev: any) => ({ ...prev, post: commentsModalData.prevPost }));
            }
        }}
        onOptionsPress={handleOptionsPress}
        nextPost={commentsModalData.nextPost}
        prevPost={commentsModalData.prevPost}
      />

      <PostOptionsModal
        visible={isOptionsVisible}
        onClose={() => setIsOptionsVisible(false)}
        onEdit={() => {
          setIsOptionsVisible(false);
          handleEdit(selectedProductForOptions);
        }}
        onDelete={() => {
          if (selectedProductForOptions?.id) {
            deleteProduct({ variables: { id: selectedProductForOptions.id } });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // ── Tab Bar ──
  tabBar: {
    flexDirection: 'row',
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    backgroundColor: '#FF6524',
    borderRadius: 2,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconBg: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ── FAB ──
  fabContainer: {
    position: 'absolute',
    right: 26,
    alignItems: 'flex-end',
    zIndex: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#FF6524',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabOptionLabelWrap: {
    backgroundColor: 'rgba(30,30,30,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  fabOptionLabelActive: {
    backgroundColor: '#FF6524',
  },
  fabOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  fabMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabMiniPrimary: {
    backgroundColor: '#FF6524',
    shadowColor: '#FF6524',
  },
  fabMiniSecondary: {
    backgroundColor: '#888',
    shadowColor: '#000',
  },
});

