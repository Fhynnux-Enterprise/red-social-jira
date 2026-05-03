export default ({ config }) => {
  const cityId = process.env.EXPO_PUBLIC_CITY_ID || 'chunchi';

  const cities = {
    chunchi: {
      name: "Chunchi City App",
      slug: "chunchi-city-app",
      icon: "./assets/images/icon.png",
      package: "com.fernando.chunchicity",
      scheme: "chunchicity",
      micPermission: "Permite que Chunchi City use el micrófono para grabar mensajes de voz."
    },
    alausi: {
      name: "Alausí Móvil",
      slug: "alausi-movil",
      icon: "./assets/images/icon.png", // Temporalmente usando el icono por defecto
      package: "com.fernando.alausimovil",
      scheme: "alausimovil",
      micPermission: "Permite que Alausí Móvil use el micrófono para grabar mensajes de voz."
    }
  };

  const cityConfig = cities[cityId] || cities.chunchi;

  return {
    ...config,
    name: cityConfig.name,
    slug: cityConfig.slug,
    version: "1.0.0",
    orientation: "portrait",
    icon: cityConfig.icon,
    scheme: cityConfig.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      package: cityConfig.package,
      adaptiveIcon: {
        backgroundColor: "#121212",
        foregroundImage: cityConfig.icon
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      config: {
        googleMobileAds: {
          androidAppId: "ca-app-pub-7868058661453955~5852649017"
        }
      }
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    extra: {
      cityName: cityId === 'alausi' ? 'Alausí' : 'Chunchi',
      cityId: cityId,
      "react-native-google-mobile-ads": {
        "androidAppId": "ca-app-pub-7868058661453955~5852649017",
        "iosAppId": "ca-app-pub-7868058661453955~5852649017"
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#121212",
          "dark": {
            "backgroundColor": "#121212"
          }
        }
      ],
      "expo-secure-store",
      "@react-native-google-signin/google-signin",
      "react-native-compressor",
      "expo-video",
      "@react-native-community/datetimepicker",
      [
        "expo-av",
        {
          "microphonePermission": cityConfig.micPermission
        }
      ],
      "expo-audio",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-7868058661453955~5852649017",
          "iosAppId": "ca-app-pub-7868058661453955~5852649017"
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  };
};
