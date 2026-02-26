import re

path = '/home/user/studio/src/app/page.tsx'

with open(path, 'r') as f:
    content = f.read()

# The block to find and replace
old = '        <section>\n          <MultiProviderTable usageLogs={usageLogs} />\n        </section>'

new = '''        {/* SDK Required Cards — shown for providers that need the SDK */}
        {apiKeys.filter(k => ["google","groq","nvidia","deepseek","kimi"].includes(k.provider)).length > 0 && (
          <section className="space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold px-1">SDK-Tracked Providers</p>
            {apiKeys
              .filter(k => ["google","groq","nvidia","deepseek","kimi"].includes(k.provider))
              .filter((k, i, arr) => arr.findIndex(x => x.provider === k.provider) === i) // dedupe by provider
              .map(k => (
                <SDKRequiredCard
                  key={k.id}
                  provider={k.provider}
                  supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
                  supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
                />
              ))}
          </section>
        )}
        <section>
          <MultiProviderTable usageLogs={usageLogs} />
        </section>'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print("✅ SDK cards injected successfully")
else:
    # Try to find what's actually there
    idx = content.find('MultiProviderTable')
    if idx > -1:
        print("MultiProviderTable found at index", idx)
        print("Context around it:")
        print(repr(content[idx-100:idx+100]))
    else:
        print("❌ MultiProviderTable not found at all")