content = open('tests/ui/fundacao-ui.spec.tsx', 'r', encoding='utf-8').read()
old_str = 'fs.readFileSync("src/pages/DashboardPage.tsx"'
new_str = 'fs.readFileSync(require(\"path\").resolve(\"src/pages/DashboardPage.tsx\")'
content = content.replace(old_str, new_str)
open('tests/ui/fundacao-ui.spec.tsx', 'w', encoding='utf-8').write(content)
print('done')
