package com.expensetrack1ux.dev

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import java.io.ByteArrayOutputStream
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdOptions
import com.google.android.gms.ads.nativead.NativeAdView

@CapacitorPlugin(name = "NativeAd")
class NativeAdPlugin : Plugin() {

    companion object {
        private const val TAG = "NativeAdPlugin"
        private const val AD_UNIT_ID = "ca-app-pub-2635018944245510/3238820311"
    }

    private var loadedNativeAd: NativeAd? = null
    private var nativeAdView: NativeAdView? = null

    @PluginMethod
    fun loadAd(call: PluginCall) {
        activity.runOnUiThread {
            try {
                val adLoader = AdLoader.Builder(activity, AD_UNIT_ID)
                    .forNativeAd { nativeAd ->
                        // Destroy previous ad if any
                        loadedNativeAd?.destroy()
                        loadedNativeAd = nativeAd

                        val result = JSObject()
                        result.put("loaded", true)
                        result.put("headline", nativeAd.headline ?: "")
                        result.put("body", nativeAd.body ?: "")
                        result.put("callToAction", nativeAd.callToAction ?: "")
                        result.put("advertiser", nativeAd.advertiser ?: "")
                        result.put("hasIcon", nativeAd.icon != null)
                        
                        // Pass icon if available as URI or Base64
                        nativeAd.icon?.let { icon ->
                            if (icon.uri != null) {
                                result.put("icon", icon.uri.toString())
                            } else if (icon.drawable != null) {
                                result.put("icon", drawableToBase64(icon.drawable!!))
                            }
                        }
                        
                        call.resolve(result)
                        Log.d(TAG, "Native ad loaded successfully")
                    }
                    .withAdListener(object : AdListener() {
                        override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                            Log.e(TAG, "Ad failed to load: ${loadAdError.message}")
                            val result = JSObject()
                            result.put("loaded", false)
                            result.put("error", loadAdError.message)
                            call.resolve(result)
                        }
                    })
                    .withNativeAdOptions(NativeAdOptions.Builder().build())
                    .build()

                adLoader.loadAd(AdRequest.Builder().build())
            } catch (e: Exception) {
                Log.e(TAG, "Error loading ad", e)
                call.reject("Failed to load ad: ${e.message}")
            }
        }
    }

    @PluginMethod
    @SuppressLint("InflateParams")
    fun showAd(call: PluginCall) {
        val nativeAd = loadedNativeAd
        if (nativeAd == null) {
            call.reject("No ad loaded. Call loadAd first.")
            return
        }

        activity.runOnUiThread {
            try {
                // Pass ad info back to WebView - the React layer renders the ad UI
                val result = JSObject()
                result.put("shown", true)
                result.put("headline", nativeAd.headline ?: "")
                result.put("body", nativeAd.body ?: "")
                result.put("callToAction", nativeAd.callToAction ?: "")
                result.put("advertiser", nativeAd.advertiser ?: "")
                result.put("hasIcon", nativeAd.icon != null)

                // Pass icon if available
                nativeAd.icon?.let { icon ->
                    if (icon.uri != null) {
                        result.put("icon", icon.uri.toString())
                    } else if (icon.drawable != null) {
                        result.put("icon", drawableToBase64(icon.drawable!!))
                    }
                }

                call.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Error showing ad", e)
                call.reject("Failed to show ad: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun recordAdClick(call: PluginCall) {
        activity.runOnUiThread {
            val nativeAd = loadedNativeAd
            if (nativeAd == null) {
                call.reject("No ad loaded")
                return@runOnUiThread
            }
            
            try {
                // To trigger the ad action, we need to click a view registered with the NativeAdView.
                // Creating a proper NativeAdView and registering a CTA view (like a Button)
                // is more reliable for AdMob than just a generic View.
                val adView = NativeAdView(activity)
                val ctaView = Button(activity).apply {
                    layoutParams = android.view.ViewGroup.LayoutParams(1, 1)
                    alpha = 0.01f // Almost invisible
                }
                
                adView.addView(ctaView)
                adView.callToActionView = ctaView
                adView.setNativeAd(nativeAd)
                
                // Important: AdMob requires the view to be attached to the window
                // hierarchy (have a window token) for programmatic clicks to be processed.
                val root = activity.window.decorView as android.view.ViewGroup
                root.addView(adView)
                
                // GIVE 50ms TO LAYOUT AND ATTACH
                ctaView.postDelayed({
                    try {
                        ctaView.isSoundEffectsEnabled = false
                        ctaView.performClick()
                        Log.d(TAG, "Ad click triggered on CTA view after layout delay")
                        
                        // Fallback: If for some reason CTA view didn't handle it, try adView click
                        // but usually ctaView is what AdMob monitors.
                    } catch (e: Exception) {
                        Log.e(TAG, "Deferred click failed", e)
                    } finally {
                        // Remove it after action
                        root.postDelayed({
                            root.removeView(adView)
                        }, 500) // Keep it a bit longer to ensure intent completes
                    }
                }, 50)
                
                call.resolve()
            } catch (e: Exception) {
                Log.e(TAG, "Error triggering ad click", e)
                call.reject("Error triggering click: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun destroyAd(call: PluginCall) {
        loadedNativeAd?.destroy()
        loadedNativeAd = null
        nativeAdView?.removeAllViews()
        nativeAdView = null
        call.resolve()
    }

    override fun handleOnDestroy() {
        loadedNativeAd?.destroy()
        loadedNativeAd = null
        super.handleOnDestroy()
    }

    private fun drawableToBase64(drawable: Drawable): String? {
        try {
            val bitmap = if (drawable is BitmapDrawable) {
                drawable.bitmap
            } else {
                val b = Bitmap.createBitmap(
                    drawable.intrinsicWidth.coerceAtLeast(1),
                    drawable.intrinsicHeight.coerceAtLeast(1),
                    Bitmap.Config.ARGB_8888
                )
                val canvas = Canvas(b)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                b
            }
            val byteArrayOutputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream)
            val byteArray = byteArrayOutputStream.toByteArray()
            return "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "Error converting drawable to base64", e)
            return null
        }
    }
}
