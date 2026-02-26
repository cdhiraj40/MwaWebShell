package com.cdhiraj40.mwawebshell

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.net.toUri

@Stable
class WebShellDebugState internal constructor(
    private val defaultUrl: String,
    private val isDebugBuild: Boolean,
    private val preferences: SharedPreferences?,
    initialUrl: String,
) {
    var currentUrl by mutableStateOf(initialUrl)
        private set

    var urlInput by mutableStateOf(initialUrl)

    val isDebugUrlBarVisible: Boolean
        get() = isDebugBuild

    fun loadUrl(url: String): String {
        val normalized = normalizeWebUrl(url) ?: defaultUrl
        currentUrl = normalized
        urlInput = normalized
        if (isDebugBuild) {
            preferences?.edit()?.putString(DEBUG_URL_KEY, normalized)?.apply()
        }
        return normalized
    }
}

@Composable
fun rememberWebShellDebugState(
    context: Context,
    defaultUrl: String,
    isDebugBuild: Boolean,
): WebShellDebugState {
    val appContext = context.applicationContext
    return remember(appContext, defaultUrl, isDebugBuild) {
        val prefs =
            if (isDebugBuild) {
                appContext.getSharedPreferences(DEBUG_PREFS_NAME, Context.MODE_PRIVATE)
            } else {
                null
            }
        val savedUrl = if (isDebugBuild) prefs?.getString(DEBUG_URL_KEY, null) else null
        val initialUrl = normalizeWebUrl(savedUrl) ?: normalizeWebUrl(defaultUrl) ?: defaultUrl
        WebShellDebugState(
            defaultUrl = defaultUrl,
            isDebugBuild = isDebugBuild,
            preferences = prefs,
            initialUrl = initialUrl,
        )
    }
}

private fun normalizeWebUrl(rawValue: String?): String? {
    val trimmed = rawValue?.trim().orEmpty()
    if (trimmed.isEmpty()) return null

    val withScheme =
        if ("://" in trimmed) {
            trimmed
        } else {
            "https://$trimmed"
        }

    val uri = withScheme.toUri()
    val scheme = uri.scheme?.lowercase()
    if (scheme != "http" && scheme != "https") return null
    if (uri.host.isNullOrBlank()) return null
    return uri.toString()
}

private const val DEBUG_PREFS_NAME = "web_shell_debug_prefs"
private const val DEBUG_URL_KEY = "debug_url"
