import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Dimensions,
  Alert,
  LayoutChangeEvent,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  TestIds,
  NativeAd,
  NativeAdView,
  NativeMediaView,
  NativeAsset,
  NativeAssetType,
} from 'react-native-google-mobile-ads';
import { useTheme } from '../../../theme/ThemeContext';
import { GET_NEXT_AD, REGISTER_AD_CLICK } from '../graphql/ads.operations';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/context/AuthContext';
import CreateLocalAdModal from '../../advertisers/components/CreateLocalAdModal';
import ConfirmModal from '../../../components/ConfirmModal';
import ReportModal from '../../reports/components/ReportModal';
import { DELETE_LOCAL_AD } from '../../advertisers/graphql/advertisers.operations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : (process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID || 'ca-app-pub-7868058661453955/2017359094');

interface NativeAdCardProps {
  isImmersive?: boolean;
  /** Datos del anuncio para mostrar uno específico (evita fetch aleatorio) */
  adData?: any;
  /** Callback al presionar el anuncio (para abrir modal) */
  onPress?: (ad: any) => void;
  /** Callback cuando se carga el anuncio desde la base de datos */
  onAdLoaded?: (ad: any) => void;
  /** Callback que devuelve la posición Y y altura del area de media (para overlay de gestos en CommentsModal) */
  onMediaLayout?: (layout: { y: number; height: number }) => void;
  /** Callback cuando se elimina u oculta el anuncio */
  onDelete?: () => void;
}

export interface NativeAdCardRef {
  openOptions: () => void;
}

/**
 * Tarjeta nativa para anuncios (Google AdMob o locales). AdMob.
 *
 * En modo inmersivo (CommentsModal):
 * - La altura se auto-ajusta al contenido real usando onLayout (sin espacio fantasma).
 * - Los gestos de swipe los maneja adSwipePan en CommentsModal.
 * - El prop onMediaLayout permite que CommentsModal ponga un overlay de swipe sobre la imagen.
 */
const NativeAdCard = React.forwardRef<NativeAdCardRef, NativeAdCardProps>(
  ({ isImmersive = false, adData, onPress, onAdLoaded, onMediaLayout, onDelete }, ref) => {
    const { colors, isDark } = useTheme();
    const { user } = useAuth() as any;

    const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [isAdOptionsVisible, setIsAdOptionsVisible] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    // Datos locales que reemplazan adData cuando el usuario edita el anuncio desde esta tarjeta
    const [localOverride, setLocalOverride] = useState<any>(null);

    // States for Modals
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      openOptions: () => setIsAdOptionsVisible(true)
    }));

    const [adLoading, setAdLoading] = useState(true);
    // Altura medida del contenido interno — usada para fijar NativeAdView sin espacio extra
    const [contentHeight, setContentHeight] = useState<number | undefined>(
      isImmersive ? SCREEN_HEIGHT * 0.75 : undefined
    );
    const nativeAdRef = useRef<NativeAd | null>(null);
    // Posición acumulada del area de media para el overlay de gestos
    const headerHeightRef = useRef(0);

    const { data, loading: queryLoading, error: queryError } = useQuery(GET_NEXT_AD, {
      fetchPolicy: 'network-only',
      skip: !!adData?.type || !!adData?.title, // No buscar si ya tenemos un tipo o datos reales cacheados
    });

    // Usar useEffect garantiza que el Feed se entere del anuncio incluso si viene de caché rápido
    const adReportedRef = useRef(false);
    useEffect(() => {
      if (!adReportedRef.current && data?.getNextAd) {
        adReportedRef.current = true;
        if (data.getNextAd.localAd) {
          onAdLoaded?.({
            ...data.getNextAd.localAd,
            realId: data.getNextAd.localAd.id, // Guardar UUID original
            type: 'LOCAL'
          });
        } else if (data.getNextAd.type === 'ADMOB') {
          onAdLoaded?.({ type: 'ADMOB' });
        }
      }
    }, [data?.getNextAd]);
    const [registerClick] = useMutation(REGISTER_AD_CLICK);

    const [deleteLocalAd] = useMutation(DELETE_LOCAL_AD, {
      onCompleted: () => {
        Toast.show({ type: 'success', text1: 'Anuncio eliminado exitosamente' });
        setIsDeleted(true);
        onDelete?.();
      },
      onError: (err) => Toast.show({ type: 'error', text1: 'Error al eliminar', text2: err.message }),
    });

    // Determinamos el tipo: LOCAL si hay datos locales, ADMOB si es explícito o si la query dice ADMOB.
    // Si no hay datos aún y está cargando, el tipo es null.
    // Si hay error en la query, forzamos ADMOB para no dejar el espacio vacío.
    const type = (adData?.type === 'LOCAL' || data?.getNextAd?.localAd)
      ? 'LOCAL'
      : (adData?.type === 'ADMOB' || data?.getNextAd?.type === 'ADMOB' || queryError ? 'ADMOB' : (queryLoading ? null : 'ADMOB'));

    // Siempre usar el UUID real para las operaciones de edición/borrado/reporte
    // Preferimos adData si ya viene con type LOCAL (incluso sin título/imagen)
    const rawAdData = localOverride || (adData?.type === 'LOCAL' ? adData : (adData?.title ? adData : data?.getNextAd?.localAd));
    const currentAdData = rawAdData ? {
      ...rawAdData,
      id: rawAdData.realId || rawAdData.id,
    } : undefined;

    const isOwner = user?.id && currentAdData?.advertiser?.id === user.id;
    // IMPORTANTE: NO poner 'return null' aquí — viola la regla de hooks de React
    // ya que useCallback y useEffect vienen después. El isDeleted se maneja en el JSX.

    const loadNativeAd = useCallback(async () => {
      try {
        setAdLoading(true);
        if (nativeAdRef.current) {
          nativeAdRef.current.destroy();
        }
        const ad = await NativeAd.createForAdRequest(AD_UNIT_ID, {
          requestNonPersonalizedAdsOnly: true,
          testDeviceIdentifiers: ['81410015-f9f0-4277-aa89-b341cca036c8'],
        });
        nativeAdRef.current = ad;
        setNativeAd(ad);
      } catch (error) {
        setNativeAd(null);
      } finally {
        setAdLoading(false);
      }
    }, []);

    useEffect(() => {
      if (type === 'ADMOB') {
        loadNativeAd();
      }
      return () => {
        if (nativeAdRef.current) {
          nativeAdRef.current.destroy();
          nativeAdRef.current = null;
        }
      };
    }, [type, loadNativeAd]);

    const handleAdOptions = () => {
      setIsAdOptionsVisible(true);
    };

    const renderAdOptionsModal = () => (
      <>
        <Modal visible={isAdOptionsVisible} transparent animationType="fade" onRequestClose={() => setIsAdOptionsVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setIsAdOptionsVisible(false)} activeOpacity={1}>
            <View style={[styles.optionsContainer, { backgroundColor: colors.surface }]}>

              {type === 'ADMOB' ? (
                <>
                  <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={() => {
                      setIsAdOptionsVisible(false);
                      Linking.openURL('https://myadcenter.google.com/home');
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={colors.text} />
                    <Text style={[styles.optionText, { color: colors.text }]}>¿Por qué este anuncio?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={() => {
                      setIsAdOptionsVisible(false);
                      Linking.openURL('https://adssettings.google.com/');
                    }}
                  >
                    <Ionicons name="settings-outline" size={20} color={colors.text} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Configuración de anuncios</Text>
                  </TouchableOpacity>

                  <View style={[styles.separator, { backgroundColor: colors.border }]} />

                  <TouchableOpacity
                    style={styles.optionBtn}
                    onPress={() => {
                      setIsAdOptionsVisible(false);
                      Linking.openURL('https://support.google.com/ads/troubleshooter/4578507');
                    }}
                  >
                    <Ionicons name="flag-outline" size={20} color={colors.text} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Reportar Anuncio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionBtn} onPress={() => { setIsAdOptionsVisible(false); setIsDeleted(true); onDelete?.(); }}>
                    <Ionicons name="eye-off-outline" size={20} color={colors.text} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Ocultar Anuncio</Text>
                  </TouchableOpacity>
                </>
              ) : isOwner ? (
                <>
                  <TouchableOpacity style={styles.optionBtn} onPress={() => { setIsAdOptionsVisible(false); setIsEditModalVisible(true); }}>
                    <Ionicons name="pencil-outline" size={20} color={colors.text} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Editar Anuncio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionBtn} onPress={() => { setIsAdOptionsVisible(false); setIsDeleteConfirmVisible(true); }}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={[styles.optionText, { color: '#EF4444' }]}>Eliminar Anuncio</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.optionBtn} onPress={() => { setIsAdOptionsVisible(false); setIsReportModalVisible(true); }}>
                    <Ionicons name="flag-outline" size={20} color={colors.text} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Reportar Anuncio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionBtn} onPress={() => { setIsAdOptionsVisible(false); setIsDeleted(true); }}>
                    <Ionicons name="eye-off-outline" size={20} color={colors.text} />
                    <Text style={[styles.optionText, { color: colors.text }]}>Ocultar Anuncio</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modales */}
        {isEditModalVisible && (
          <CreateLocalAdModal
            visible={isEditModalVisible}
            onClose={() => setIsEditModalVisible(false)}
            onSuccess={(updatedAd) => {
              setIsEditModalVisible(false);
              // Actualizar el estado local para reflejar los cambios inmediatamente
              if (updatedAd) setLocalOverride({ ...updatedAd, realId: updatedAd.id });
            }}
            ad={currentAdData}
          />
        )}

        <ConfirmModal
          visible={isDeleteConfirmVisible}
          title="Eliminar Anuncio"
          message="¿Seguro que deseas eliminar este anuncio? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          isDestructive={true}
          onCancel={() => setIsDeleteConfirmVisible(false)}
          onConfirm={() => {
            setIsDeleteConfirmVisible(false);
            const targetId = currentAdData.realId || currentAdData.id;
            deleteLocalAd({ variables: { id: targetId } });
          }}
        />

        {isReportModalVisible && currentAdData && (
          <ReportModal
            visible={isReportModalVisible}
            onClose={() => setIsReportModalVisible(false)}
            reportedItemId={currentAdData.realId || currentAdData.id}
            reportedItemType="LOCAL_AD"
            onContentDeleted={() => {
              setIsDeleted(true);
              onDelete?.();
            }}
          />
        )}
      </>
    );

    const handleLocalAdPress = async (url?: string) => {
      if (adData?.id) {
        try { await registerClick({ variables: { adId: adData.id } }); } catch { /* no-op */ }
      }
      if (url) {
        let finalUrl = url.trim();
        // Si la URL no empieza con http:// o https://, le agregamos https:// por defecto
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl;
        }

        Linking.canOpenURL(finalUrl).then(supported => {
          if (supported) {
            Linking.openURL(finalUrl).catch(() => {
              Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo abrir el enlace' });
            });
          } else {
            Toast.show({ type: 'error', text1: 'URL no válida', text2: 'El formato del enlace es incorrecto' });
          }
        });
      }
    };

    const handleWhatsApp = () => {
      if (!adData?.whatsappPhone) return;
      const clean = adData.whatsappPhone.replace(/[^+\d]/g, '');
      Linking.openURL(`https://wa.me/${clean}`).catch(() =>
        Toast.show({ type: 'error', text1: 'No se pudo abrir WhatsApp' })
      );
      handleLocalAdPress();
    };

    // ── SKELETON ──
    if (isDeleted) return null;
    if (queryLoading || (type === 'ADMOB' && adLoading) || type === null) {
      return (
        <View style={[styles.card, styles.skeleton, { backgroundColor: colors.surface }]}>
          <View style={[styles.skeletonLine, { width: '40%', height: 12, marginBottom: 8 }]} />
          <View style={[styles.skeletonLine, { width: '70%', height: 18, marginBottom: 12 }]} />
          <View style={[styles.skeletonMedia, { backgroundColor: isDark ? '#2A2A2A' : '#EBEBEB' }]} />
        </View>
      );
    }

    // ── RENDER ADMOB ──
    if (type === 'ADMOB') {
      if (!nativeAd) return null;

      return (
        <View style={{ position: 'relative' }}>
          <NativeAdView
            nativeAd={nativeAd}
            style={[
              styles.card,
              { backgroundColor: colors.surface },
              isImmersive && styles.cardImmersive,
              // En inmersivo: height explícita (necesaria para NativeAdView nativo).
              // Se actualiza con onLayout del contenido para eliminar el espacio fantasma.
              isImmersive && contentHeight !== undefined && { height: contentHeight },
            ]}
          >
            {/*
          Contenedor interno medible.
          onLayout captura la altura real del contenido y la asigna al NativeAdView,
          eliminando el espacio vacío que se genera con una altura fija genérica.
        */}
            <View
              onLayout={(e: LayoutChangeEvent) => {
                if (isImmersive) {
                  const h = e.nativeEvent.layout.height;
                  if (h > 50) setContentHeight(h); // Solo actualizar si medición válida
                }
              }}
            >
              {/* Agrupamos Cabecera, Descripción y Media para que el overlay de gestos cubra todo esto sin tapar el CTA */}
              <View
                onLayout={(e: LayoutChangeEvent) => {
                  if (isImmersive && onMediaLayout) {
                    onMediaLayout({
                      y: e.nativeEvent.layout.y,
                      height: e.nativeEvent.layout.height,
                    });
                  }
                }}
              >
                {/* Cabecera estilo Post */}
                <View style={styles.header}>
                  <View style={styles.authorInfo}>
                    {nativeAd.icon?.url ? (
                      <NativeAsset assetType={NativeAssetType.ICON}>
                        <Image source={{ uri: nativeAd.icon.url }} style={styles.advertiserIcon} />
                      </NativeAsset>
                    ) : (
                      <View style={[styles.advertiserIconFallback, { backgroundColor: '#FF6524' }]}>
                        <Ionicons name="megaphone" size={14} color="white" />
                      </View>
                    )}
                    <View style={styles.authorTextBlock}>
                      <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                        <Text style={[styles.advertiserName, { color: colors.text }]} numberOfLines={1}>
                          {nativeAd.advertiser || nativeAd.headline || 'Anunciante'}
                        </Text>
                      </NativeAsset>
                      <Text style={[styles.advertiserSubtitle, { color: colors.textSecondary }]}>
                        Publicidad
                      </Text>
                    </View>
                  </View>
                  {!isImmersive && (
                    <View style={{ width: 28, height: 28 }} />
                  )}
                </View>

                {/* Descripción */}
                {nativeAd.body ? (
                  <NativeAsset assetType={NativeAssetType.BODY}>
                    <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                      {nativeAd.body}
                    </Text>
                  </NativeAsset>
                ) : null}

                {/* Media: imagen o video */}
                {nativeAd.mediaContent && (
                  <NativeMediaView
                    style={[styles.mediaView, isImmersive && styles.mediaViewImmersive]}
                    resizeMode="cover"
                  />
                )}
              </View>

              {/* Footer: Rating + CTA */}
              <View style={styles.footer}>
                {(nativeAd.starRating || nativeAd.store || nativeAd.price) && (
                  <View style={styles.appMetaRow}>
                    {nativeAd.starRating ? (
                      <NativeAsset assetType={NativeAssetType.STAR_RATING}>
                        <View style={styles.starsContainer}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons
                              key={i}
                              name={i < Math.round(nativeAd.starRating!) ? 'star' : 'star-outline'}
                              size={12}
                              color="#FFB400"
                            />
                          ))}
                          <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                            {nativeAd.starRating.toFixed(1)}
                          </Text>
                        </View>
                      </NativeAsset>
                    ) : null}
                    {nativeAd.store ? (
                      <NativeAsset assetType={NativeAssetType.STORE}>
                        <Text style={[styles.storeText, { color: colors.textSecondary }]}>
                          {nativeAd.store}
                        </Text>
                      </NativeAsset>
                    ) : null}
                  </View>
                )}

                <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                  <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>
                      {nativeAd.callToAction || 'Ver más'}
                    </Text>
                    <Ionicons name="open-outline" size={16} color="white" />
                  </TouchableOpacity>
                </NativeAsset>
              </View>
            </View>
          </NativeAdView>

          {/* 
            Para anuncios de Google (ADMOB), no mostramos nuestro botón personalizado
            ya que Google inyecta su propio icono de AdChoices automáticamente en el NativeAdView.
            En el feed (no inmersivo), mostramos un botón mínimo de info para cumplir con las políticas.
        */}
          {!isImmersive && (
            <TouchableOpacity
              onPress={handleAdOptions}
              style={[styles.moreBtn, { position: 'absolute', top: 26, right: 24, zIndex: 100, elevation: 10 }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {renderAdOptionsModal()}
        </View>
      );
    }

    // ── RENDER LOCAL ──
    if (type === 'LOCAL' && currentAdData) {
      const coverImage = currentAdData.media?.find((m: any) => m.type === 'IMAGE')?.url;
      const advertiser = currentAdData.advertiser;
      const displayName = advertiser
        ? `${advertiser.firstName ?? ''} ${advertiser.lastName ?? ''}`.trim() || advertiser.username
        : 'Anunciante';

      return (
        <>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface },
              isImmersive && styles.cardImmersive,
            ]}
          >
            {/* ─ Header estilo Post ─ */}
            <View style={styles.header}>
              <View style={styles.authorInfo}>
                {advertiser?.photoUrl ? (
                  <Image source={{ uri: advertiser.photoUrl }} style={styles.advertiserIcon} />
                ) : (
                  <View style={[styles.advertiserIconFallback, { backgroundColor: '#FF6524' }]}>
                    <Ionicons name="megaphone" size={16} color="white" />
                  </View>
                )}
                <View style={styles.authorTextBlock}>
                  <Text style={[styles.advertiserName, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={styles.adBadgeRow}>
                    <View style={styles.adBadge}>
                      <Ionicons name="megaphone" size={9} color="white" />
                      <Text style={styles.adBadgeText}>Publicidad</Text>
                    </View>
                  </View>
                </View>
              </View>
              {!isImmersive && (
                <TouchableOpacity onPress={handleAdOptions} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => onPress?.({ ...currentAdData, isAd: true })}
              onLayout={(e: LayoutChangeEvent) => {
                if (isImmersive && onMediaLayout) {
                  onMediaLayout({ y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height });
                }
              }}
            >
              <Text style={[styles.headline, { color: colors.text }]}>{currentAdData.title}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={isImmersive ? undefined : 3}>
                {currentAdData.description}
              </Text>

              {/* ─ Imagen en formato 3:4 ─ */}
              {coverImage && (
                <View style={styles.localAdMedia}>
                  <Image
                    source={{ uri: coverImage }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* ─ Botones de acción ─ */}
            <View style={styles.footer}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {currentAdData.whatsappPhone && (
                  <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: '#25D366', flex: 1 }]}
                    onPress={handleWhatsApp}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="white" />
                    <Text style={styles.ctaText}>WhatsApp</Text>
                  </TouchableOpacity>
                )}
                {currentAdData.actionUrl && (
                  <TouchableOpacity
                    style={[styles.ctaButton, { flex: 1 }]}
                    onPress={() => handleLocalAdPress(currentAdData.actionUrl)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ctaText}>{currentAdData.actionLabel || 'Ver más'}</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                )}
                {/* Si no hay ni whatsapp ni url, mostrar botón genérico */}
                {!currentAdData.whatsappPhone && !currentAdData.actionUrl && (
                  <TouchableOpacity style={[styles.ctaButton, { flex: 1 }]} onPress={() => handleLocalAdPress()} activeOpacity={0.85}>
                    <Text style={styles.ctaText}>Ver más</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          {renderAdOptionsModal()}
        </>
      );
    }

    return null;
  });

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 8,
    marginVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  cardImmersive: {
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'visible', // Permite que onLayout del contenido dicte la altura real
  },
  skeleton: {
    padding: 16,
    minHeight: 200,
  },
  skeletonLine: {
    borderRadius: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
  },
  skeletonMedia: {
    flex: 1,
    borderRadius: 12,
    minHeight: 180,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  advertiserIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  advertiserIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorTextBlock: {
    flex: 1,
  },
  advertiserName: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  advertiserSubtitle: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '400',
  },
  moreBtn: {
    padding: 4,
  },
  headline: {
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  mediaView: {
    width: '100%',
    minHeight: 220,
  },
  mediaViewImmersive: {
    minHeight: SCREEN_HEIGHT * 0.38,
  },
  footer: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  appMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  storeText: {
    fontSize: 12,
  },
  ctaButton: {
    backgroundColor: '#FF6524',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  ctaText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: '#FF6524',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  // Local ad specific
  adBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  adBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FF6524',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  adBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  // 3:4 media container (width auto, height = width * 4/3)
  localAdMedia: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionsContainer: {
    width: '90%',
    borderRadius: 20,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    opacity: 0.3,
  },
});

export default React.memo(NativeAdCard);
