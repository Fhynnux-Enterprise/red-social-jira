import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Animated, Pressable, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_STORE_PRODUCTS, GET_MY_STORE_PRODUCTS, DELETE_STORE_PRODUCT } from '../graphql/store.operations';
import { TOGGLE_SAVE_POST, GET_SAVED_POSTS } from '../../feed/graphql/posts.operations';
import StoreProductCard from '../components/StoreProductCard';
import CreateProductModal from '../components/CreateProductModal';
import CommentsModal from '../../comments/components/CommentsModal';
import ListFooter from '../../../components/ListFooter';
import PostOptionsModal from '../../feed/components/PostOptionsModal';
import Toast from 'react-native-toast-message';
import { GET_AD_FREQUENCY } from '../../ads/graphql/ads.operations';
import NativeAdCard from '../../ads/components/NativeAdCard';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';

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
  const apolloClient = useApolloClient();

  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const isFocused = useIsFocused();
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

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // ── Control de Visibilidad para Videos: solo UN video activo a la vez ──
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const onViewableItemsChangedAll = useCallback(({ viewableItems: vItems }: any) => {
    if (activeTabRef.current !== 'all') return;
    if (!vItems || vItems.length === 0) {
      setActiveVideoId(null);
      return;
    }
    const mostVisible = vItems.reduce((best: any, cur: any) => {
      return (cur.percentVisible ?? 0) > (best.percentVisible ?? 0) ? cur : best;
    }, vItems[0]);
    setActiveVideoId(mostVisible?.item?.id ?? null);
  }, []);

  const onViewableItemsChangedMine = useCallback(({ viewableItems: vItems }: any) => {
    if (activeTabRef.current !== 'mine') return;
    if (!vItems || vItems.length === 0) {
      setActiveVideoId(null);
      return;
    }
    const mostVisible = vItems.reduce((best: any, cur: any) => {
      return (cur.percentVisible ?? 0) > (best.percentVisible ?? 0) ? cur : best;
    }, vItems[0]);
    setActiveVideoId(mostVisible?.item?.id ?? null);
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 0,
  }).current;

  const navigation = useNavigation();

  // ── Pausar todos los videos al salir de esta pantalla ──
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setActiveVideoId(null);
    });
    return unsubscribe;
  }, [navigation]);

  const handleTabPress = (key: TabKey, index: number) => {
    setActiveVideoId(null);
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

  const [adFrequency, setAdFrequency] = useState(5);
  const [loadedAds, setLoadedAds] = useState<Record<string, any>>({});
  
  const { data: configData, refetch: refetchAdFrequency } = useQuery(GET_AD_FREQUENCY, {
    fetchPolicy: 'network-only',
  });

  React.useEffect(() => {
    if (configData?.getAdFrequency != null) {
      setAdFrequency(configData.getAdFrequency);
    }
  }, [configData?.getAdFrequency]);

  useFocusEffect(
    React.useCallback(() => {
      refetchAdFrequency();
    }, [refetchAdFrequency])
  );

  const injectAds = React.useCallback((items: any[], freq: number, cachedAds: Record<string, any>) => {
    const result: any[] = [];
    items.forEach((item, index) => {
      result.push(item);
      if ((index + 1) % freq === 0) {
        const adId = `ad-after-${item.id}`;
        const cachedAd = cachedAds[adId] || {};
        if (cachedAd.isDeleted) return;
        result.push({
          ...cachedAd,
          realId: cachedAd.id || cachedAd.realId,
          id: adId,
          isAd: true,
          __typename: 'Ad',
        });
      }
    });
    return result;
  }, []);

  const productsAll = React.useMemo(() => {
    const raw = allData?.storeProducts ?? [];
    const freq = configData?.getAdFrequency ?? adFrequency;
    return injectAds(raw, freq, loadedAds);
  }, [allData?.storeProducts, configData, adFrequency, injectAds, loadedAds]);

  const productsMine = mineData?.myStoreProducts ?? [];

  const products = activeTab === 'all' ? productsAll : productsMine;
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
    onCompleted: (_, clientOptions) => {
      // Evict the deleted item from all Apollo caches instantly
      const deletedId = clientOptions?.variables?.id;
      if (deletedId) {
        apolloClient.cache.evict({ id: apolloClient.cache.identify({ __typename: 'StoreProduct', id: deletedId }) });
        apolloClient.cache.gc();
      }
      setIsOptionsVisible(false);
      Toast.show({ type: 'success', text1: 'Producto eliminado' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    }
  });

  const [toggleSavePost] = useMutation(TOGGLE_SAVE_POST);

  const handleToggleSave = useCallback(async (item: any) => {
    if (!item) return;
    const itemId = item.id;
    const wasSaved = !!item.isSaved;

    try {
      await toggleSavePost({
        variables: { postId: itemId, itemType: 'STORE_PRODUCT' },
        optimisticResponse: { toggleSavePost: !wasSaved },
        refetchQueries: [{ query: GET_SAVED_POSTS }],
        update: (cache, { data }) => {
          const cacheId = cache.identify({ __typename: 'StoreProduct', id: itemId });
          if (cacheId) {
            cache.modify({
              id: cacheId,
              fields: { isSaved: () => !!data?.toggleSavePost }
            });
          }
        }
      });
      Toast.show({
        type: 'success',
        text1: wasSaved ? 'Quitado de guardados' : 'Guardado correctamente',
        position: 'bottom'
      });
    } catch (err) {
      console.error('Error toggling save:', err);
      Toast.show({ type: 'error', text1: 'No se pudo procesar la acción', position: 'bottom' });
    }
  }, [toggleSavePost]);

  const handleOptionsPress = (product: any) => {
    setSelectedProductForOptions(product);
    setIsOptionsVisible(true);
  };

  const handleCloseModal = (wasEditing?: boolean) => {
    setCreateVisible(false);
    setEditItem(null);
    // Only refetch if we were editing (creation already updates the cache)
    if (wasEditing) {
      refetchAll();
      refetchMine();
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,101,36,0.08)' : 'rgba(255,101,36,0.06)' }]}>
        <Ionicons name="storefront-outline" size={44} color={colors.primary} style={{ opacity: 0.7 }} />
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
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textSecondary },
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
      {(activeTab === 'all' ? (loadingAll && productsAll.length === 0) : (loadingMine && productsMine.length === 0)) ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* List for Todos */}
          <View style={{ flex: 1, display: activeTab === 'all' ? 'flex' : 'none' }}>
            <FlatList
              data={productsAll}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                if (item.isAd) {
                  const cachedAdData = loadedAds[item.id];
                  const adDataToPass = cachedAdData
                      ? { ...cachedAdData, id: cachedAdData.realId || cachedAdData.id }
                      : (item.type || item.title ? { ...item, id: item.realId || item.id } : undefined);
                  return (
                    <View>
                      <View style={{ marginHorizontal: 8 }}>
                        <NativeAdCard 
                            adData={adDataToPass}
                            onAdLoaded={(adData) => {
                                if (!loadedAds[item.id]) {
                                    setLoadedAds(prev => ({ ...prev, [item.id]: adData }));
                                }
                            }}
                            onDelete={() => {
                                setLoadedAds(prev => ({ ...prev, [item.id]: { ...prev[item.id], isDeleted: true } }));
                            }}
                            onPress={(ad) => setSelectedPostForComments({ 
                                post: { ...ad, id: item.id, realId: ad.realId || ad.id }, 
                                minimize: true, 
                                initialTab: 'comments' 
                            })} 
                        />
                      </View>
                      <View style={styles.feedDivider} />
                    </View>
                  );
                }

                return (
                  <View>
                    <StoreProductCard
                      item={item}
                      cardWidth={undefined}
                      onEdit={handleEdit}
                      onPress={() => setSelectedPostForComments({ post: item, minimize: true, initialTab: 'comments' })}
                      onCommentPress={() => setSelectedPostForComments({ post: item, minimize: false, initialTab: 'comments' })}
                      onToggleSave={() => handleToggleSave(item)}
                      isSaved={item.isSaved}
                      isViewable={activeTab === 'all' && !selectedPostForComments && activeVideoId === item.id}
                      isFocused={isFocused}
                    />
                    <View style={styles.feedDivider} />
                  </View>
                );
              }}
              ItemSeparatorComponent={null}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={productsAll.length > 0 ? <ListFooter /> : null}
              onRefresh={refetchAll}
              refreshing={false}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              scrollEventThrottle={16}
              onViewableItemsChanged={onViewableItemsChangedAll}
              viewabilityConfig={viewabilityConfig}
            />
          </View>

          {/* List for Mis Productos */}
          <View style={{ flex: 1, display: activeTab === 'mine' ? 'flex' : 'none' }}>
            <FlatList
              data={productsMine}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                return (
                  <View>
                    <StoreProductCard
                      item={item}
                      cardWidth={undefined}
                      onEdit={handleEdit}
                      onPress={() => setSelectedPostForComments({ post: item, minimize: true, initialTab: 'comments' })}
                      onCommentPress={() => setSelectedPostForComments({ post: item, minimize: false, initialTab: 'comments' })}
                      onToggleSave={() => handleToggleSave(item)}
                      isSaved={item.isSaved}
                      isViewable={activeTab === 'mine' && !selectedPostForComments && activeVideoId === item.id}
                      isFocused={isFocused}
                    />
                    <View style={styles.feedDivider} />
                  </View>
                );
              }}
              ItemSeparatorComponent={null}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={productsMine.length > 0 ? <ListFooter /> : null}
              onRefresh={refetchMine}
              refreshing={false}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              scrollEventThrottle={16}
              onViewableItemsChanged={onViewableItemsChangedMine}
              viewabilityConfig={viewabilityConfig}
            />
          </View>
        </>
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
        onClose={() => handleCloseModal(!!editItem)}
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
            setIsOptionsVisible(false);

            // Determinar cuál será la siguiente publicación a mostrar
            const currentIndex = products.findIndex((p: any) => p.id === selectedProductForOptions.id);
            let targetPost = null;

            if (currentIndex !== -1) {
              if (currentIndex < products.length - 1) {
                targetPost = products[currentIndex + 1];
              } else if (currentIndex > 0) {
                targetPost = products[currentIndex - 1];
              }
            }

            deleteProduct({ variables: { id: selectedProductForOptions.id } })
              .then(() => {
                if (targetPost) {
                  setSelectedPostForComments({
                    post: targetPost,
                    minimize: !!selectedPostForComments?.minimize,
                    initialTab: selectedPostForComments?.initialTab
                  });
                } else {
                  setSelectedPostForComments(null);
                }
              });
          }
        }}
      />
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    backgroundColor: colors.primary,
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
  feedDivider: {
    height: 0.6,
    backgroundColor: '#BDBDBD',
    opacity: 0.35,
    marginTop: 10,
    marginBottom: 20,
  },

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
    shadowColor: colors.primary,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  fabMiniSecondary: {
    backgroundColor: '#888',
    shadowColor: '#000',
  },
});

