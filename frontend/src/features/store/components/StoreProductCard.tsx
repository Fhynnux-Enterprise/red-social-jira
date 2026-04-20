import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Modal, ActivityIndicator, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useRouter } from 'expo-router';
import ImageCarousel from '../../feed/components/ImageCarousel';
import Toast from 'react-native-toast-message';
import { useMutation } from '@apollo/client/react';
import { DELETE_STORE_PRODUCT, GET_STORE_PRODUCTS, GET_MY_STORE_PRODUCTS, TOGGLE_STORE_PRODUCT_LIKE } from '../graphql/store.operations';
import { GET_OR_CREATE_CHAT } from '../../chat/graphql/chat.operations';
import { useApolloClient } from '@apollo/client/react';
import { useNavigation } from '@react-navigation/native';
import ReportModal from '../../reports/components/ReportModal';
import CopyTextModal from '../../../components/CopyTextModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface StoreProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  location?: string;
  contactPhone?: string;
  condition?: string;
  category?: string;
  isAvailable: boolean;
  createdAt: string;
  editedAt?: string;
  seller: { id: string; username: string; firstName: string; lastName: string; photoUrl?: string };
  media?: { url: string; type: string; order: number }[];
  likes?: { user: { id: string } }[];
  commentsCount?: number;
}

interface Props {
  item: StoreProduct;
  cardWidth?: number;
  hideSellerRow?: boolean;
  onEdit?: (item: StoreProduct) => void;
  onPress?: () => void;
  onCommentPress?: () => void;
  isModalView?: boolean;
}

function formatDate(isoString: string) {
  const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
  const date = new Date(utcString);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === hoy.toDateString()) return `Hoy a las ${timeString}`;
  if (date.toDateString() === ayer.toDateString()) return `Ayer a las ${timeString}`;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year} a las ${timeString}`;
}

function conditionLabel(c?: string) {
  if (c === 'new') return 'Nuevo';
  if (c === 'like_new') return 'Como nuevo';
  if (c === 'used') return 'Usado';
  return c ?? '';
}

function conditionColor(c?: string) {
  if (c === 'new') return '#4CAF50';
  if (c === 'like_new') return '#2196F3';
  return '#FF9800';
}

export default function StoreProductCard({ item, cardWidth, hideSellerRow, onEdit, onPress, onCommentPress, isModalView }: Props) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth() as any;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [innerCardWidth, setInnerCardWidth] = useState(SCREEN_WIDTH - 8);

  const isOwner = user?.id === item.seller?.id;

  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);

  const client = useApolloClient();

  const displayLiked = item.likes?.some(l => l.user?.id === user?.id) || false;
  const [localLiked, setLocalLiked] = useState(displayLiked);
  const [localCount, setLocalCount] = useState(item.likes?.length || 0);

  useEffect(() => {
    setLocalLiked(item.likes?.some(l => l.user?.id === user?.id) || false);
    setLocalCount(item.likes?.length || 0);
  }, [item.likes, user?.id]);

  const [toggleLikeMutation] = useMutation(TOGGLE_STORE_PRODUCT_LIKE);
  const [getOrCreateChat, { loading: creatingChat }] = useMutation(GET_OR_CREATE_CHAT);

  const getFullCopyText = () => {
    let text = `${item.title}\n\n`;
    text += `Precio: $${parseFloat(String(item.price)).toFixed(2)} ${item.currency || 'USD'}\n`;
    text += `Descripción: ${item.description}\n`;
    if (item.location) text += `Ubicación: ${item.location}\n`;
    if (item.contactPhone) text += `Teléfono: ${item.contactPhone}\n`;
    if (item.condition) text += `Estado: ${conditionLabel(item.condition)}\n`;
    return text;
  };

  const handleLikePress = () => {
    if (!user?.id) return;
    const next = !localLiked;
    setLocalLiked(next);
    setLocalCount(c => next ? c + 1 : Math.max(0, c - 1));

    let optimisticLikes = [...(item.likes || [])];
    if (localLiked) {
      optimisticLikes = optimisticLikes.filter(l => l.user?.id !== user.id);
    } else {
      optimisticLikes.push({
        __typename: 'StoreProductLike',
        id: `temp-${Date.now()}`,
        user: {
          __typename: 'User',
          id: user.id,
        }
      });
    }

    toggleLikeMutation({
      variables: { productId: item.id },
      optimisticResponse: {
        toggleStoreProductLike: {
          __typename: 'StoreProduct',
          id: item.id,
          likes: optimisticLikes,
        }
      }
    }).catch(() => {
      setLocalLiked(!next);
      setLocalCount(c => !next ? c + 1 : Math.max(0, c - 1));
    });
  };

  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_STORE_PRODUCT, {
    refetchQueries: [
      { query: GET_STORE_PRODUCTS, variables: { limit: 20, offset: 0 } },
      { query: GET_MY_STORE_PRODUCTS },
    ],
    onCompleted: () => {
      setConfirmDelete(false);
      Toast.show({ type: 'success', text1: 'Producto eliminado' });
    },
    onError: (err) => {
      setConfirmDelete(false);
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    },
  });

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={onPress ? 0.7 : 1}
        onPress={onPress}
        onLongPress={() => setIsCopyModalVisible(true)}
        delayLongPress={250}
        onLayout={(e) => setInnerCardWidth(e.nativeEvent.layout.width)}
      >
        {!hideSellerRow && (
          <View style={styles.header}>
            <View style={styles.storeBanner}>
              <Ionicons name="storefront-outline" size={12} color="#FF6524" style={{ marginRight: 6 }} />
              <Text style={styles.storeBannerText}>
                {item.category ? item.category.toUpperCase() : 'TIENDA'}
              </Text>
            </View>

            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.sellerRow}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/profile', params: { userId: item.seller?.id } })}
              >
                <View style={styles.avatarWrap}>
                  {item.seller?.photoUrl ? (
                    <Image source={{ uri: item.seller.photoUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarInitials}>
                      {item.seller?.firstName?.[0]}{item.seller?.lastName?.[0]}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>
                    {item.seller?.firstName} {item.seller?.lastName}
                  </Text>
                  <Text style={[styles.sellerDate, { color: colors.textSecondary }]}>
                    {formatDate(item.createdAt)}
                    {!!item.editedAt && " • Editado"}
                  </Text>
                </View>
              </TouchableOpacity>

              {isOwner && (
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.ellipsis} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              {!isOwner && (
                <TouchableOpacity onPress={() => setReportVisible(true)} style={styles.ellipsis} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                  <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text, flex: 1 }]}>
              {item.title}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {item.location && (
                <>
                  <Ionicons name="location-outline" size={13} color="#FF6524" />
                  <Text style={[styles.locationText, { color: colors.textSecondary, marginLeft: 4 }]} numberOfLines={1}>
                    {item.location}
                  </Text>
                </>
              )}
            </View>
            <View style={[styles.priceBadge, { backgroundColor: isDark ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)' }]}>
              <Text style={[styles.price, { color: '#4CAF50' }]}>
                Precio: ${parseFloat(String(item.price)).toFixed(2)}
              </Text>
            </View>
          </View>

          {item.condition && (
            <View style={[styles.conditionBadge, { backgroundColor: `${conditionColor(item.condition)}18` }]}>
              <View style={[styles.conditionDot, { backgroundColor: conditionColor(item.condition) }]} />
              <Text style={[styles.conditionText, { color: conditionColor(item.condition) }]}>
                {conditionLabel(item.condition)}
              </Text>
            </View>
          )}

          {item.description.length > 150 && !isDescExpanded ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {item.description.slice(0, 150)}
              <Text style={{ color: colors.primary, fontWeight: 'bold' }} onPress={() => setIsDescExpanded(true)}> ...más</Text>
            </Text>
          ) : (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {item.description}
              {item.description.length > 150 && isDescExpanded && (
                <Text style={{ color: colors.primary, fontWeight: 'bold' }} onPress={() => setIsDescExpanded(false)}> Ver menos.</Text>
              )}
            </Text>
          )}
        </View>

        {item.media && item.media.length > 0 && (
          <View style={{ width: '100%', backgroundColor: colors.surface }}>
            <ImageCarousel media={item.media} containerWidth={cardWidth ?? innerCardWidth} customAspectRatio={1.1} onPress={onPress} disableFullscreen={!!onPress && !isModalView} />
          </View>
        )}

        <View style={styles.contactRow}>
          {item.contactPhone && (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
              onPress={async () => {
                const rawPhone = item.contactPhone!.replace(/\s+/g, '').replace(/[^+\d]/g, '');
                const phone = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone;
                const { Linking } = await import('react-native');
                Linking.openURL(`https://wa.me/${phone}?text=Hola, vi tu publicación "${item.title}" y me interesa.`);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: colors.primary, opacity: creatingChat ? 0.7 : 1 }]}
            activeOpacity={0.8}
            disabled={creatingChat}
            onPress={async () => {
              if (!item.seller?.id) return;
              try {
                const { data } = await getOrCreateChat({ variables: { targetUserId: item.seller.id } });
                if (data?.getOrCreateOneOnOneChat?.id) {
                  router.push({
                    pathname: '/chatRoom',
                    params: { conversationId: data.getOrCreateOneOnOneChat.id }
                  });
                }
              } catch (err) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el chat con el vendedor.' });
              }
            }}
          >
            <Ionicons name="chatbubbles-outline" size={16} color="#FFF" />
            <Text style={styles.contactBtnText}>Mensaje Privado</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {!isModalView && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress} activeOpacity={0.7}>
              <Ionicons
                name={localLiked ? 'heart' : 'heart-outline'}
                size={21}
                color={localLiked ? '#FF3B30' : colors.textSecondary}
              />
              {localCount > 0 && (
                <Text style={[styles.actionCount, localLiked && { color: '#FF3B30' }]}>
                  {localCount}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onCommentPress ?? onPress} activeOpacity={0.7}>
              <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
              {(item.commentsCount ?? 0) > 0 && (
                <Text style={styles.actionCount}>{item.commentsCount}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)} statusBarTranslucent>
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.menuBackdrop}>
              <TouchableWithoutFeedback>
                <View style={[styles.menuBox, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
                  <View style={[styles.menuHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
                  <Text style={[styles.menuTitle, { color: colors.text }]}>Opciones</Text>
                  
                  {onEdit && (
                    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => { setMenuVisible(false); onEdit(item); }}>
                      <View style={[styles.menuIconWrap, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                        <Ionicons name="pencil" size={20} color={colors.text} />
                      </View>
                      <Text style={[styles.menuLabel, { color: colors.text }]}>Editar producto</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => { setMenuVisible(false); setTimeout(() => setConfirmDelete(true), 150); }}>
                    <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                      <Ionicons name="trash" size={20} color="#FF3B30" />
                    </View>
                    <Text style={[styles.menuLabel, { color: '#FF3B30' }]}>Eliminar producto</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.menuItem, { marginTop: 10, borderBottomWidth: 0 }]} onPress={() => setMenuVisible(false)}>
                    <View style={[styles.menuIconWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.menuLabel, { color: colors.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)} statusBarTranslucent>
          <View style={styles.confirmBackdrop}>
            <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
              <View style={styles.confirmIcon}>
                <Ionicons name="trash" size={32} color="#F44336" />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.text }]}>¿Eliminar publicación?</Text>
              <Text style={[styles.confirmMsg, { color: colors.textSecondary }]}>
                Esta acción no se puede deshacer. El producto dejará de aparecer en la tienda.
              </Text>
              <View style={styles.confirmBtns}>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.border }]} onPress={() => setConfirmDelete(false)} disabled={deleting}>
                  <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#F44336' }]} onPress={() => deleteProduct({ variables: { id: item.id } })} disabled={deleting}>
                  <Text style={[styles.confirmBtnText, { color: '#FFF' }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </TouchableOpacity>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        reportedItemId={item.id}
        reportedItemType="PRODUCT"
        onContentDeleted={() => {
          client.cache.evict({ id: client.cache.identify({ __typename: 'StoreProduct', id: item.id }) });
          client.cache.gc();
          setReportVisible(false);
        }}
      />
      <CopyTextModal
        visible={isCopyModalVisible}
        textToCopy={getFullCopyText()}
        onClose={() => setIsCopyModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    marginHorizontal: 4,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,101,36,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6524',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  storeBannerText: { color: '#FF6524', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FF6524', justifyContent: 'center', alignItems: 'center', marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  avatarInitials: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  sellerName: { fontWeight: '700', fontSize: 14 },
  sellerDate: { fontSize: 12, marginTop: 1 },
  ellipsis: { padding: 4 },
  body: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 0 },
  title: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  priceBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', minWidth: 72 },
  price: { fontSize: 16, fontWeight: '900' },
  conditionBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8, gap: 5 },
  conditionDot: { width: 7, height: 7, borderRadius: 4 },
  conditionText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText: { fontSize: 13 },
  contactRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 4, paddingTop: 2 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  contactBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  // Menu
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10 },
  menuHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuLabel: { fontSize: 16, fontWeight: '500' },
  // Confirm
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { width: '100%', maxWidth: 340, borderRadius: 16, padding: 24, alignItems: 'center' },
  confirmIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(244,67,54,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  confirmMsg: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  confirmBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 16, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14, marginBottom: 2, marginTop: 4 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionCount: { fontSize: 13, fontWeight: '500', marginLeft: 5, color: '#888' },
});
