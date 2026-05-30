import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Modal, ActivityIndicator, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useRouter } from 'expo-router';
import ImageCarousel from '../../feed/components/ImageCarousel';
import Toast from 'react-native-toast-message';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { DELETE_STORE_PRODUCT, GET_STORE_PRODUCTS, GET_MY_STORE_PRODUCTS, TOGGLE_STORE_PRODUCT_LIKE } from '../graphql/store.operations';
import { TOGGLE_FOLLOW, IS_FOLLOWING } from '../../follows/graphql/follows.operations';
import { GET_OR_CREATE_CHAT } from '../../chat/graphql/chat.operations';
import { useApolloClient } from '@apollo/client/react';
import { useNavigation } from '@react-navigation/native';
import ReportModal from '../../reports/components/ReportModal';
import CopyTextModal from '../../../components/CopyTextModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GenerateNotificationFromPostModal } from '../../feed/components/PostOptionsModal';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STORE_LIKE_WRITE_FRAGMENT = gql`fragment SLikeCardFrag on StoreProductLike { id user { id firstName lastName photoUrl } }`;


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
  onToggleSave?: (item: StoreProduct) => void;
  isSaved?: boolean;
  isViewable?: boolean;
  showTopDivider?: boolean;
  /** Cuando el modal controla el like, pasa su handler aquí para evitar sistemas de like paralelos */
  onLikePress?: () => void;
  /** Like state controlado externamente (desde CommentsModal) */
  externalLiked?: boolean;
  /** Conteo de likes controlado externamente (desde CommentsModal) */
  externalLikeCount?: number;
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

const StoreProductCard = React.forwardRef((props: any, ref: any) => {
  const { item, cardWidth, hideSellerRow, onEdit, onPress, onCommentPress, isModalView, onToggleSave, isSaved: propIsSaved, showTopDivider, isViewable, isFocused, onClose, onOptionsPress, onLikePress, externalLiked, externalLikeCount } = props;
  const carouselRef = React.useRef<any>(null);

  React.useImperativeHandle(ref, () => ({
    openFullscreen: (index = 0) => {
      carouselRef.current?.openViewer?.(index);
    }
  }));
  const { colors, isDark } = useTheme();
  const { user } = useAuth() as any;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [innerCardWidth, setInnerCardWidth] = useState(SCREEN_WIDTH - 16);
  const isOwner = user?.id === item.seller?.id;

  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const isModeratorOrAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const client = useApolloClient();

  const displayLiked = item.likes?.some((l: any) => l.user?.id === user?.id) || false;
  const displayCount = item.likes?.length || 0;
  const [localLiked, setLocalLiked] = useState<boolean>(displayLiked);
  const [localCount, setLocalCount] = useState<number>(displayCount);

  // Si hay control externo (CommentsModal), usar esos valores en vez del estado local
  const effectiveLiked = externalLiked !== undefined ? externalLiked : localLiked;
  const effectiveCount = externalLikeCount !== undefined ? externalLikeCount : localCount;

  // Igual que PostCard: sincronizar cuando Apollo actualiza el caché
  useEffect(() => {
    setLocalLiked(displayLiked);
    setLocalCount(displayCount);
  }, [displayLiked, displayCount]);

  const displayIsSaved = propIsSaved ?? (item as any).isSaved;

  const [toggleLikeMutation] = useMutation(TOGGLE_STORE_PRODUCT_LIKE);
  const [getOrCreateChat, { loading: creatingChat }] = useMutation(GET_OR_CREATE_CHAT);

  const { data: followData } = useQuery<any>(IS_FOLLOWING, {
    variables: { followingId: item.seller?.id },
    skip: !item.seller?.id || isOwner,
    fetchPolicy: 'cache-and-network',
  });
  const isFollowing = followData?.isFollowing || false;

  const [toggleFollow] = useMutation<any>(TOGGLE_FOLLOW, {
    variables: { followingId: item.seller?.id },
    optimisticResponse: {
      toggleFollow: true,
    },
    update(cache, { data: { toggleFollow: newValue } }) {
      cache.writeQuery({
        query: IS_FOLLOWING,
        variables: { followingId: item.seller?.id },
        data: { isFollowing: newValue },
      });
      cache.modify({
        id: cache.identify({ __typename: 'User', id: item.seller?.id }),
        fields: {
          followersCount(existingCount = 0) {
            return newValue ? existingCount + 1 : Math.max(0, existingCount - 1);
          }
        }
      });
    },
  });

  const getFullCopyText = () => {
    let text = `${item.title}\n\nPrecio: $${parseFloat(String(item.price)).toFixed(2)} ${item.currency || 'USD'}\n`;
    text += `Descripción: ${item.description}\n`;
    if (item.location) text += `Ubicación: ${item.location}\n`;
    return text;
  };

  const handleLikePress = () => {
    if (!user?.id) return;

    const nextLiked = !localLiked;
    setLocalLiked(nextLiked);
    setLocalCount(c => nextLiked ? c + 1 : Math.max(0, c - 1));

    // Construir optimisticLikes igual que PostCard
    let optimisticLikes = [...(item.likes || [])];
    if (displayLiked) {
      optimisticLikes = optimisticLikes.filter((l: any) => l.user?.id !== user.id);
    } else {
      optimisticLikes.push({
        __typename: 'StoreProductLike',
        id: `temp-${Date.now()}`,
        user: {
          __typename: 'User',
          id: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          photoUrl: user.photoUrl || null,
        }
      });
    }

    toggleLikeMutation({
      variables: { productId: item.id },
      refetchQueries: ['GetLikedItems'],
      optimisticResponse: {
        toggleStoreProductLike: {
          __typename: 'StoreProduct',
          id: item.id,
          likes: optimisticLikes,
        }
      },
      update: (cache, { data }) => {
        const result = data?.toggleStoreProductLike;
        if (!result?.likes) return;

        const cacheId = cache.identify({
          __typename: 'StoreProduct',
          id: item.id,
        });
        if (!cacheId) return;

        // Escribir cada like como referencia en el caché para normalización correcta
        const likeRefs = result.likes.map((like: any) =>
          cache.writeFragment({
            data: like,
            fragment: STORE_LIKE_WRITE_FRAGMENT,
          })
        );
        cache.modify({
          id: cacheId,
          fields: {
            likes() {
              return likeRefs;
            }
          }
        });
      }
    }).catch(() => {
      setLocalLiked(displayLiked);
      setLocalCount(displayCount);
    });
  };

  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_STORE_PRODUCT, {
    onCompleted: () => {
      setConfirmDelete(false);
      Toast.show({ type: 'success', text1: 'Producto eliminado' });
    }
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const isVideo = item.media && item.media[0]?.type?.toLowerCase() === 'video';
  const hasCounter = item.media && item.media.length > 1;
  const topRowY = 12;
  const expandTop = 100;
  const muteTop = isModalView ? (expandTop + 44) : 56;
  const conditionTop = isModalView 
      ? (isVideo ? (muteTop + 44) : (expandTop + 44))
      : (isVideo ? (muteTop + 44) : 56);

  const dynamicSliderOffset = isModalView ? (hasCounter ? 58 : 32) : 0;

  return (
    <>
      {showTopDivider && (
        <View style={[styles.fullWidthDivider, { marginTop: 0, marginBottom: 12 }]} />
      )}

      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={onPress} 
        onLongPress={() => setIsCopyModalVisible(true)}
        delayLongPress={250}
        activeOpacity={0.9}
        onLayout={(e) => setInnerCardWidth(e.nativeEvent.layout.width)}
      >
        <View style={{ overflow: 'hidden' }}>
            {/* ── Card Head (Estilo Oferta) ── */}
            <View style={styles.cardHead}>
              <View style={[styles.typeBadgeHead, { backgroundColor: '#2196F315' }]}>
                <Ionicons name="cart" size={12} color="#2196F3" />
                <Text style={[styles.typeBadgeTextHead, { color: '#2196F3' }]}>PUBLICACIÓN DE TIENDA</Text>
              </View>
            </View>

            <View style={styles.mediaContainer}>
              {item.media && item.media.length > 0 ? (
                <ImageCarousel 
                  ref={carouselRef}
                  media={item.media} 
                  containerWidth={cardWidth ?? innerCardWidth} 
                  customAspectRatio={0.8} 
                  onPress={onPress} 
                  disableFullscreen={!!onPress && !isModalView} 
                  disablePressToFullscreen={isModalView}
                  muteButtonStyle={{ top: muteTop, right: 12 }}
                  onIndexChange={setActiveIndex}
                  hidePagination={false}
                  showBottomCounter={true}
                  isInteractive={isModalView}
                  sliderBottomOffset={dynamicSliderOffset}
                  hideExpand={isModalView}
                  isViewable={isViewable}
                  isFocused={isFocused}
                  overlay={
                    <View style={styles.bottomActionStrip}>
                      {/* 1. Integrated Counter (Replaces Dots) */}
                      {item.media && item.media.length > 1 && (
                        <View style={styles.integratedCounter}>
                          <Text style={styles.integratedCounterText}>
                            {activeIndex + 1} / {item.media.length}
                          </Text>
                        </View>
                      )}

                      {/* 2. Contact Buttons */}
                      <View style={styles.contactButtonsRow}>
                        <TouchableOpacity 
                          style={[styles.contactBtnTransparent, { borderColor: '#25D366' }]} 
                          onPress={async () => {
                            const rawPhone = item.contactPhone?.replace(/\s+/g, '').replace(/[^+\d]/g, '');
                            if (rawPhone) {
                              const { Linking } = await import('react-native');
                              Linking.openURL(`https://wa.me/${rawPhone}?text=Hola, me interesa: ${item.title}`);
                            }
                          }}
                        >
                          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                          <Text style={[styles.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.contactBtnTransparent, { borderColor: '#2196F3' }]} 
                          onPress={async () => {
                            if (!item.seller?.id) return;
                            const { data } = await getOrCreateChat({ variables: { targetUserId: item.seller.id } });
                            if (data?.getOrCreateOneOnOneChat?.id) {
                              router.push({ pathname: '/chatRoom', params: { conversationId: data.getOrCreateOneOnOneChat.id } });
                            }
                          }}
                        >
                          <Ionicons name="mail-outline" size={18} color="#2196F3" />
                          <Text style={[styles.contactBtnText, { color: '#2196F3' }]}>Mensaje Privado</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  }
                />
              ) : (
                <View style={[styles.noImage, { height: 450, backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
                  <Ionicons name="image-outline" size={54} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                </View>
              )}

              {/* Botón de Cerrar (Solo en Modal) */}
              {isModalView && onClose && (
                <TouchableOpacity 
                  style={[styles.glassCirclePure, { position: 'absolute', top: 12, right: 12, zIndex: 30 }]}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              )}

              {/* Botón de Opciones (Solo en Modal) */}
              {isModalView && onOptionsPress && (
                <TouchableOpacity 
                  style={[styles.glassCirclePure, { position: 'absolute', top: 56, right: 12, zIndex: 30 }]}
                  onPress={onOptionsPress}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="white" />
                </TouchableOpacity>
              )}

              {/* Botón de Expandir (Solo en Modal) */}
              {isModalView && (
                <TouchableOpacity 
                  style={[styles.glassCirclePure, { position: 'absolute', top: expandTop, right: 12, zIndex: 30 }]}
                  onPress={() => carouselRef.current?.openViewer?.(activeIndex)}
                >
                  <Ionicons name="expand" size={20} color="white" />
                </TouchableOpacity>
              )}

              {/* Single Integrated Seller + Follow Overlay */}
              {!hideSellerRow && (
                <TouchableOpacity 
                  style={styles.sellerOverlay}
                  onPress={() => router.push({ pathname: '/profile', params: { userId: item.seller?.id } })}
                >
                  <View style={styles.avatarMiniOverlay}>
                    {item.seller?.photoUrl ? (
                      <Image source={{ uri: item.seller.photoUrl }} style={styles.avatarImg} />
                    ) : (
                      <Text style={{ color: '#FFF', fontSize: 10 }}>{item.seller?.firstName?.[0]}</Text>
                    )}
                  </View>
                  <View style={styles.sellerTextColumn}>
                    <Text style={styles.sellerNameOverlay} numberOfLines={1}>
                      {item.seller?.firstName} {item.seller?.lastName}
                    </Text>
                    <Text style={styles.sellerNicknameOverlay} numberOfLines={1}>
                      @{item.seller?.username}
                    </Text>
                  </View>

                  {!isOwner && !isFollowing && (
                    <>
                      <View style={styles.sellerDivider} />
                      <TouchableOpacity 
                        style={styles.followBtnMini} 
                        onPress={() => {
                          toggleFollow().catch(err => console.error('Error toggling follow in StoreProductCard:', err));
                        }}
                      >
                        <Text style={styles.followTextMini}>Seguir</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {/* Condition Badge - TOP RIGHT (Dynamic position) */}
              {item.condition && (
                <View style={[styles.conditionOverlayTop, { backgroundColor: conditionColor(item.condition), top: conditionTop }]}>
                  <Text style={styles.conditionTextPremium}>{conditionLabel(item.condition).toUpperCase()}</Text>
                </View>
              )}


              {/* Top Right Actions (Menu only) - Hidden in modal to avoid overlap */}
              {!isModalView && (
                <View style={styles.topRightActions}>
                  <TouchableOpacity 
                    style={styles.glassCircleHeader} 
                    onPress={() => setMenuVisible(true)}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}

            </View>

        {/* 1.5 INSTAGRAM STYLE ACTIONS (Under image) */}
        <View style={styles.instagramActionsRow}>
            <TouchableOpacity style={styles.instaBtn} onPress={onLikePress ?? handleLikePress}>
              <Feather 
                name="heart" 
                size={22} 
                color={effectiveLiked ? "#FF3B30" : colors.text} 
              />
              {effectiveCount > 0 && (
                <Text style={[styles.instaCount, { color: colors.text }]}>{effectiveCount}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.instaBtn} onPress={onCommentPress ?? onPress}>
              <Feather name="message-circle" size={22} color={colors.text} />
              {(item.commentsCount ?? 0) > 0 && (
                <Text style={[styles.instaCount, { color: colors.text }]}>{item.commentsCount}</Text>
              )}
            </TouchableOpacity>
          </View>

        {/* 2. BODY CONTENT (Pro Grid Style) */}
        <View style={styles.contentPaddingPro}>
          <View style={styles.proHeaderGrid}>
            <View style={styles.proTitleCol}>
              <Text style={[styles.proTitle, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.location && (
                <View style={styles.proLocationRow}>
                  <Ionicons name="location-sharp" size={12} color={colors.textSecondary} />
                  <Text style={[styles.proLocation, { color: colors.textSecondary }]}>
                    {item.location}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.proInfoCol}>
              <Text style={styles.proPriceGreen}>
                ${parseFloat(String(item.price)).toLocaleString()}
              </Text>
            </View>
          </View>

          <Text 
            style={[styles.proDescription, { color: colors.textSecondary }]} 
            numberOfLines={isDescExpanded ? undefined : 3}
          >
            {item.description}
          </Text>

          {item.description.length > 100 && (
            <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {isDescExpanded ? 'Ver menos' : 'Leer más...'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.dateTextPro, { color: colors.textSecondary }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        </View>
      </TouchableOpacity>


      {/* MODALS */}
      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuBox, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
                <View style={[styles.menuHandle, { backgroundColor: isDark ? '#444' : '#DDD' }]} />
                <Text style={[styles.menuTitle, { color: colors.text }]}>Opciones</Text>

                {isModeratorOrAdmin && (
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => {
                      setMenuVisible(false);
                      setShowNotificationForm(true);
                    }}
                  >
                    <Ionicons name="megaphone" size={20} color="#ff6524" style={styles.menuIcon} />
                    <Text style={[styles.menuLabel, { color: '#ff6524', fontWeight: 'bold' }]}>Generar notificación</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 

                  style={styles.menuItem} 
                  onPress={() => {
                    setMenuVisible(false);
                    onToggleSave?.(item);
                  }}
                >
                  <Ionicons 
                    name={displayIsSaved ? "bookmark" : "bookmark-outline"} 
                    size={20} 
                    color={displayIsSaved ? colors.primary : colors.text} 
                    style={styles.menuIcon} 
                  />
                  <Text style={[styles.menuLabel, { color: colors.text }]}>
                    {displayIsSaved ? 'Quitar de guardados' : 'Guardar producto'}
                  </Text>
                </TouchableOpacity>

                {isOwner ? (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onEdit?.(item); }}>
                      <Ionicons name="pencil" size={20} color={colors.text} style={styles.menuIcon} />
                      <Text style={[styles.menuLabel, { color: colors.text }]}>Editar producto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setConfirmDelete(true); }}>
                      <Ionicons name="trash" size={20} color="#FF3B30" style={styles.menuIcon} />
                      <Text style={[styles.menuLabel, { color: '#FF3B30' }]}>Eliminar producto</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setReportVisible(true); }}>
                    <Ionicons name="flag" size={20} color={colors.text} style={styles.menuIcon} />
                    <Text style={[styles.menuLabel, { color: colors.text }]}>Reportar producto</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>¿Eliminar producto?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.border }]} onPress={() => setConfirmDelete(false)}>
                <Text style={{ color: colors.text }}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#FF3B30' }]} onPress={() => deleteProduct({ variables: { id: item.id } })}>
                <Text style={{ color: '#FFF' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} reportedItemId={item.id} reportedItemType="PRODUCT" onContentDeleted={() => setReportVisible(false)} />
      <CopyTextModal visible={isCopyModalVisible} textToCopy={getFullCopyText()} onClose={() => setIsCopyModalVisible(false)} />

      {showNotificationForm && (
        <GenerateNotificationFromPostModal
          visible={showNotificationForm}
          onClose={() => setShowNotificationForm(false)}
          post={{
            ...item,
            title: item.title,
            description: item.description,
            media: item.media || item.storeMedia,
            __typename: 'StoreProduct',
          }}
        />
      )}
    </>
  );
});

export default StoreProductCard;

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  card: {
    marginVertical: 0,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 0, 
  },
  mediaContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  noImage: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    zIndex: 20,
  },
  sellerDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  followBtnMini: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  followTextMini: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '800',
  },
  avatarMiniOverlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  sellerTextColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sellerNameOverlay: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  sellerNicknameOverlay: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  conditionOverlayTop: {
    position: 'absolute',
    top: 144, // 12 + 38 + 6 + 38 + 6 + 38 + 6
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 10,
    alignSelf: 'flex-end',
  },
  // ── Head Badge Style ──
  cardHead: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  typeBadgeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  typeBadgeTextHead: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  contentPaddingIndustrial: {
    padding: 16,
  },
  industrialTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  industrialDivider: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  contentPaddingPro: {
    padding: 16,
    paddingTop: 12,
  },
  proHeaderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 14,
  },
  proTitleCol: {
    flex: 1,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  proInfoCol: {
    alignItems: 'flex-end',
  },
  proPriceGreen: {
    fontSize: 20,
    fontWeight: '900',
    color: '#27ae60',
    marginBottom: 2,
  },
  proLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  proLocation: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  proDescription: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  dateTextPro: {
    fontSize: 11,
    marginTop: 12,
    opacity: 0.7,
    textAlign: 'left',
  },
  fullWidthDivider: {
    height: 0.6,
    backgroundColor: '#BDBDBD',
    marginTop: 0, 
    marginBottom: 2, 
    width: '120%', 
    marginLeft: -40, 
    opacity: 0.35,
    zIndex: 10,
    elevation: 5,
  },
  conditionTextPremium: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  glassEllipsis: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 4,
  },
  titleLocationRow: {
    marginBottom: 6,
  },
  descriptionPremium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  interactionPill: {
    position: 'absolute',
    bottom: 70, // Just above the bottom action strip (approx 60-64 height)
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 10,
    zIndex: 20,
  },
  pillAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pillDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomActionStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'center',
    zIndex: 15,
  },
  integratedCounter: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  integratedCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  instagramActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 18,
  },
  followBadgeOverlay: {
    position: 'absolute',
    bottom: 52, // Just above the contact bar
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    zIndex: 20,
  },
  followBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  instaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instaCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    marginTop: 16,
    opacity: 0.4,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  topRightActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 25,
  },
  glassCircleHeader: {
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    minWidth: 36,
    gap: 4,
  },
  glassCirclePure: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  contactButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 16,
    gap: 12,
  },
  contactBtnTransparent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  contactBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  // Modals Styles
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuBox: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 12 },
  menuHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  menuIcon: { marginRight: 16 },
  menuLabel: { fontSize: 16, fontWeight: '600' },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { width: '80%', padding: 24, borderRadius: 24, alignItems: 'center' },
  confirmTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
  confirmBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
});
