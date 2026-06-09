const fs = require('fs');
const path = require('path');
const { 
  withProjectBuildGradle, 
  withAndroidManifest, 
  withDangerousMod, 
  withAndroidStyles 
} = require('@expo/config-plugins');

const withNotifeeMavenRepo = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const contents = config.modResults.contents;
      if (!contents.includes('@notifee/react-native/android/libs')) {
        const searchRegex = /allprojects\s*\{\s*repositories\s*\{/;
        const replacement = 'allprojects {\n  repositories {\n    maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }';
        config.modResults.contents = contents.replace(searchRegex, replacement);
      }
    }
    return config;
  });
};

const withAndroidPackageManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const packageName = config.android?.package || 'com.fernando.chunchicity';
    config.modResults.manifest.$['package'] = packageName;
    return config;
  });
};

const withAndroidBrandedSplash = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidResDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res'
      );
      
      // 1. Copy the FynnuX brand logo to drawable directory
      const drawableDir = path.join(androidResDir, 'drawable');
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }

      const sourcePath = path.join(
        config.modRequest.projectRoot,
        'assets/chunchi-city-images/fynnux-branding-footer.png'
      );
      const destPath = path.join(drawableDir, 'fynnux_brand.png');

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      } else {
        console.warn(`[BrandedSplash] Source logo not found at: ${sourcePath}`);
      }

      // 2. Create the values-v31 directory and write styles.xml
      const valuesV31Dir = path.join(androidResDir, 'values-v31');
      if (!fs.existsSync(valuesV31Dir)) {
        fs.mkdirSync(valuesV31Dir, { recursive: true });
      }

      const v31StylesPath = path.join(valuesV31Dir, 'styles.xml');
      const v31StylesContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
    <item name="android:windowSplashScreenBehavior">icon_preferred</item>
    <item name="android:windowSplashScreenBrandingImage">@drawable/fynnux_brand</item>
  </style>
</resources>
`;

      fs.writeFileSync(v31StylesPath, v31StylesContent, 'utf8');

      return config;
    },
  ]);
};

export default ({ config }) => {
  const cityId = process.env.EXPO_PUBLIC_CITY_ID || 'chunchi';

  const cities = {
    chunchi: {
      name: "Chunchi City App",
      slug: "chunchi-city-app",
      icon: "./assets/chunchi-city-images/icon.png",
      package: "com.fernando.chunchicity",
      scheme: "chunchicity",
      micPermission: "Permite que Chunchi City use el micrófono para grabar mensajes de voz."
    },
    alausi: {
      name: "Alausí Móvil",
      slug: "alausi-movil",
      icon: "./assets/chunchi-city-images/icon.png", // Temporalmente usando el icono por defecto
      package: "com.fernando.alausimovil",
      scheme: "alausimovil",
      micPermission: "Permite que Alausí Móvil use el micrófono para grabar mensajes de voz."
    }
  };

  const cityConfig = cities[cityId] || cities.chunchi;

  const cityConfigData = {
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
      googleServicesFile: "./google-services.json",
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
      favicon: "./assets/chunchi-city-images/favicon.png"
    },
    extra: {
      cityName: cityId === 'alausi' ? 'Alausí' : 'Chunchi',
      cityId: cityId,
      "react-native-google-mobile-ads": {
        "androidAppId": "ca-app-pub-7868058661453955~5852649017",
        "iosAppId": "ca-app-pub-7868058661453955~5852649017"
      },
      eas: {
        projectId: "0eef93b7-16ef-429e-9a7e-229d9f823c56"
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/chunchi-city-images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#000000",
          "dark": {
            "backgroundColor": "#000000"
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
      ],
      "expo-notifications"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  };

  return withAndroidBrandedSplash(withAndroidPackageManifest(withNotifeeMavenRepo(cityConfigData)));
};
