import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumea.app',
  appName: 'Lumea',
  webDir: 'client/dist',
  server: {
    androidScheme: 'https',
    // During development, you can use this for live reload
    // url: 'http://YOUR-LOCAL-IP:5000', 
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FFFFFF",
      showSpinner: true,
      spinnerColor: "#3A86FF",
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FFFFFF'
    },
  }
};

export default config;