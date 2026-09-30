/**
 * MFW native bridge contract.
 * Web/PWA keeps working without Capacitor. Native features progressively
 * replace web fallbacks when running inside the iOS shell.
 */
(function(){
  'use strict';

  function cap(){
    return window.Capacitor || null;
  }
  function isNative(){
    var c=cap();
    return !!(c && typeof c.isNativePlatform==='function' && c.isNativePlatform());
  }
  function plugin(name){
    var c=cap();
    return c && c.Plugins ? c.Plugins[name] : null;
  }

  var api = window.MFWNative = {
    isNative:isNative,

    async haptic(kind){
      if(!isNative()) return false;
      var H=plugin('Haptics'); if(!H)return false;
      try{
        if(kind==='success' && H.notification) await H.notification({type:'SUCCESS'});
        else if(kind==='warning' && H.notification) await H.notification({type:'WARNING'});
        else if(H.impact) await H.impact({style:kind==='heavy'?'HEAVY':'LIGHT'});
        return true;
      }catch(_){return false;}
    },

    async registerPush(){
      if(!isNative())return {native:false};
      var P=plugin('PushNotifications'); if(!P)return {native:true,available:false};
      var permission=await P.checkPermissions();
      if(permission.receive==='prompt') permission=await P.requestPermissions();
      if(permission.receive!=='granted')return {native:true,granted:false};
      await P.register();
      return {native:true,granted:true};
    },

    async openNativeScanner(mode){
      if(!isNative())return {native:false};
      var S=plugin('MFWScanner');
      if(!S)return {native:true,available:false};
      return S.scan({mode:mode||'access'});
    },

    async addWalletPass(passBase64){
      if(!isNative())return {native:false};
      var W=plugin('MFWWallet');
      if(!W)return {native:true,available:false};
      return W.addPass({passBase64:passBase64});
    },

    async routeDeepLink(url){
      if(!url)return false;
      var u;
      try{u=new URL(url);}catch(_){return false;}
      var path=u.pathname||'/';
      if(path.indexOf('/event/')===0){
        var eventId=path.split('/')[2];
        if(window.MFWRoute)window.MFWRoute({kind:'event',id:eventId});
        return true;
      }
      if(path.indexOf('/brand/')===0){
        var brandId=path.split('/')[2];
        if(window.MFWRoute)window.MFWRoute({kind:'brand',id:brandId});
        return true;
      }
      if(path==='/pass' || path==='/me'){
        if(window.MFWRoute)window.MFWRoute({kind:'profile'});
        return true;
      }
      return false;
    },

    async init(){
      if(!isNative())return {native:false};
      var App=plugin('App');
      if(App && App.addListener){
        try{
          await App.addListener('appUrlOpen',function(event){
            if(event&&event.url)api.routeDeepLink(event.url);
          });
        }catch(_){}
      }
      return {native:true};
    }
  };

  api.init();
})();