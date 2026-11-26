#!/usr/bin/env python3
"""
Build do fliperama.

Lê os conteúdos em markdown (conteudos/*.md e docs/PROJETO.md), entende só um
conjunto pequeno e conhecido de formatações e gera uma árvore de dados em
site/js/content.js. O navegador nunca interpreta markdown nem HTML: ele só
monta elementos a partir dessa árvore.

Regras de segurança aplicadas aqui:
  * links só podem ser https:// ou apontar pra outra fase (./0X-nome.md)
  * qualquer outro link faz o build falhar
  * HTML escrito no markdown vira texto comum

Uso:
    python3 scripts/build.py
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import re
import sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "conteudos"
DOCS_FILE = ROOT / "docs" / "PROJETO.md"
SITE_DIR = ROOT / "site"
OUT_FILE = SITE_DIR / "js" / "content.js"
SW_FILE = SITE_DIR / "sw.js"

REVISAO = "novembro de 2026"

# Ordem das fases. A fase 3 tem dois cartuchos.
PHASES = [
    {
        "numero": 1,
        "icone": "🪪",
        "nome": "Perfil no jogo",
        "resumo": "Foto, título, Sobre e o básico pra teu LinkedIn sair do modo abandonado.",
        "cartuchos": [{"id": "01", "arquivo": "01-linkedin-perfil.md", "rotulo": None}],
        "revisao": "Conteúdo revisado em " + REVISAO + ". O LinkedIn muda botões e telas de vez em quando.",
    },
    {
        "numero": 2,
        "icone": "📣",
        "nome": "Bora aparecer",
        "resumo": "Como transformar projeto e vivência em post, sem vergonha.",
        "cartuchos": [{"id": "02", "arquivo": "02-linkedin-conteudo.md", "rotulo": None}],
        "revisao": "Conteúdo revisado em " + REVISAO + ".",
    },
    {
        "numero": 3,
        "icone": "💸",
        "nome": "Meus pilas",
        "resumo": "Organizar o dim dim de um jeito leve. Escolhe teu cartucho ou joga os dois.",
        "cartuchos": [
            {"id": "03-gurias", "arquivo": "03-meus-pilas-gurias.md", "rotulo": "Gurias"},
            {"id": "03-guris", "arquivo": "03-meus-pilas-guris.md", "rotulo": "Guris"},
        ],
        "revisao": "Valores e regras revisados em " + REVISAO + ". Salário mínimo, juros e regras de investimento mudam com o tempo: confere sempre nas fontes oficiais.",
    },
    {
        "numero": 4,
        "icone": "🎓",
        "nome": "Faculdade, who?",
        "resumo": "Áreas da tecnologia, cursos, testes e como entrar.",
        "cartuchos": [{"id": "04", "arquivo": "04-faculdade-who.md", "rotulo": None}],
        "revisao": "Informações revisadas em " + REVISAO + ". Datas e regras do ENEM, SiSU, ProUni e FIES mudam todo ano: confere no edital.",
    },
    {
        "numero": 5,
        "icone": "🎮",
        "nome": "Comunidades tech",
        "resumo": "Onde vivem, do que se alimentam e como montar tua party.",
        "cartuchos": [{"id": "05", "arquivo": "05-comunidades-tech.md", "rotulo": None}],
        "revisao": "Lista revisada em " + REVISAO + ". Comunidades e eventos mudam de agenda e de casa: confere nas redes de cada uma.",
    },
]

FILE_TO_ID = {c["arquivo"]: c["id"] for p in PHASES for c in p["cartuchos"]}

# Arquivos que o service worker guarda pra funcionar offline.
SW_ASSETS = [
    "./",
    "./index.html",
    "./favicon.svg",
    "./css/arcade.css",
    "./js/app.js",
    "./js/content.js",
    "./js/dom.js",
    "./js/game.js",
    "./js/render.js",
    "./js/save.js",
]


class BuildError(Exception):
    pass


# ---------------------------------------------------------------------------
# Inline
# ---------------------------------------------------------------------------

INLINE_RE = re.compile(
    r"(`[^`]+`)"                                  # 1 código
    r"|(\*\*(.+?)\*\*)"                           # 2,3 negrito
    r"|(\[([^\]]+)\]\(([^)\s]+)\))"              # 4,5,6 link
    r"|(\*([^*\s][^*]*?)\*)"                      # 7,8 itálico com *
    r"|((?<![\w])_([^_\s][^_]*?)_(?![\w]))"       # 9,10 itálico com _
)

INTERNAL_LINK_RE = re.compile(r"^\./(0[1-9]-[a-z0-9-]+\.md)$")


class Ctx:
    def __init__(self, origem: str):
        self.origem = origem
        self.links_internos = 0
        self.links_externos = 0


def make_link(text: str, href: str, ctx: Ctx) -> dict:
    children = parse_inline(text, ctx)
    m = INTERNAL_LINK_RE.match(href)
    if m:
        target = FILE_TO_ID.get(m.group(1))
        if not target:
            raise BuildError(f"{ctx.origem}: link interno pra fase que não existe: {href}")
        ctx.links_internos += 1
        return {"t": "a", "k": "int", "to": target, "c": children}
    u = urlparse(href)
    if u.scheme == "https" and u.netloc and not u.username and not u.password:
        ctx.links_externos += 1
        return {"t": "a", "k": "ext", "href": href, "c": children}
    raise BuildError(f"{ctx.origem}: link não permitido (só https ou outra fase): {href}")


def parse_inline(s: str, ctx: Ctx) -> list:
    out: list = []
    pos = 0
    for m in INLINE_RE.finditer(s):
        if m.start() > pos:
            out.append({"t": "text", "v": s[pos:m.start()]})
        if m.group(1):
            out.append({"t": "code", "v": m.group(1)[1:-1]})
        elif m.group(2):
            out.append({"t": "b", "c": parse_inline(m.group(3), ctx)})
        elif m.group(4):
            out.append(make_link(m.group(5), m.group(6), ctx))
        elif m.group(7):
            out.append({"t": "i", "c": parse_inline(m.group(8), ctx)})
        elif m.group(9):
            out.append({"t": "i", "c": parse_inline(m.group(10), ctx)})
        pos = m.end()
    if pos < len(s):
        out.append({"t": "text", "v": s[pos:]})
    return merge_text(out)


def merge_text(nodes: list) -> list:
    merged: list = []
    for n in nodes:
        if n["t"] == "text" and merged and merged[-1]["t"] == "text":
            merged[-1]["v"] += n["v"]
        else:
            merged.append(n)
    return merged


def paragraph_inline(lines: list[str], ctx: Ctx) -> list:
    nodes: list = []
    for idx, raw in enumerate(lines):
        hard_break = raw.rstrip().endswith("\\")
        text = raw.rstrip()
        if hard_break:
            text = text[:-1]
        nodes.extend(parse_inline(text.strip(), ctx))
        if idx < len(lines) - 1:
            nodes.append({"t": "br"} if hard_break else {"t": "text", "v": " "})
    return merge_text(nodes)


# ---------------------------------------------------------------------------
# Blocos
# ---------------------------------------------------------------------------

HEADING_RE = re.compile(r"^(#{1,4})\s+(.*)$")
HR_RE = re.compile(r"^-{3,}\s*$")
LIST_RE = re.compile(r"^(\s*)([-*]|\d+\.)\s+(.*)$")
TASK_RE = re.compile(r"^\[( |x|X)\]\s+(.*)$")


def is_block_start(line: str) -> bool:
    return bool(
        line.startswith("```")
        or HEADING_RE.match(line)
        or HR_RE.match(line)
        or line.startswith(">")
        or line.startswith("|")
        or LIST_RE.match(line)
    )


def split_row(row: str) -> list[str]:
    r = row.strip()
    if r.startswith("|"):
        r = r[1:]
    if r.endswith("|") and not r.endswith("\\|"):
        r = r[:-1]
    cells = re.split(r"(?<!\\)\|", r)
    return [c.strip().replace("\\|", "|") for c in cells]


def parse_table(rows: list[str], ctx: Ctx) -> dict:
    if len(rows) < 2 or not re.match(r"^\|?\s*:?-{3,}", rows[1].strip()):
        raise BuildError(f"{ctx.origem}: tabela sem linha separadora")
    head = split_row(rows[0])
    body = [split_row(r) for r in rows[2:]]
    for r in body:
        if len(r) != len(head):
            raise BuildError(f"{ctx.origem}: tabela com número de colunas diferente: {r}")
    return {
        "t": "table",
        "head": [parse_inline(c, ctx) for c in head],
        "rows": [[parse_inline(c, ctx) for c in r] for r in body],
    }


def parse_list(lines: list[str], i: int, ctx: Ctx):
    m = LIST_RE.match(lines[i])
    base = len(m.group(1))
    ordered = m.group(2)[0].isdigit()
    items: list = []
    while i < len(lines):
        m = LIST_RE.match(lines[i])
        if not m:
            break
        indent = len(m.group(1))
        if indent > base and items:
            sub, i = parse_list(lines, i, ctx)
            items[-1].setdefault("sub", []).append(sub)
            continue
        if indent < base or m.group(2)[0].isdigit() != ordered:
            break
        text = m.group(3)
        item: dict = {}
        tm = TASK_RE.match(text)
        if tm:
            item["task"] = True
            text = tm.group(2)
        item["c"] = parse_inline(text, ctx)
        items.append(item)
        i += 1
    return {"t": "ol" if ordered else "ul", "items": items}, i


CALLOUTS = (("💡", "tip"), ("⚠️", "warn"), ("🗓️", "save"))


def parse_blocks(lines: list[str], ctx: Ctx) -> list:
    blocks: list = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            j = i + 1
            buf = []
            while j < len(lines) and not lines[j].startswith("```"):
                buf.append(lines[j])
                j += 1
            if j >= len(lines):
                raise BuildError(f"{ctx.origem}: bloco de código sem fechamento")
            blocks.append({"t": "pre", "v": "\n".join(buf)})
            i = j + 1
            continue
        m = HEADING_RE.match(line)
        if m:
            blocks.append({"t": "h", "l": len(m.group(1)), "c": parse_inline(m.group(2).strip(), ctx)})
            i += 1
            continue
        if HR_RE.match(line):
            blocks.append({"t": "hr"})
            i += 1
            continue
        if line.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                rest = lines[i][1:]
                buf.append(rest[1:] if rest.startswith(" ") else rest)
                i += 1
            kind = "quote"
            first = next((b for b in buf if b.strip()), "")
            for emoji, k in CALLOUTS:
                if first.lstrip().startswith(emoji):
                    kind = k
            blocks.append({"t": "quote", "k": kind, "c": parse_blocks(buf, ctx)})
            continue
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            blocks.append(parse_table(rows, ctx))
            continue
        if LIST_RE.match(line):
            block, i = parse_list(lines, i, ctx)
            blocks.append(block)
            continue
        buf = []
        while i < len(lines) and lines[i].strip() and not is_block_start(lines[i]):
            buf.append(lines[i])
            i += 1
        blocks.append({"t": "p", "c": paragraph_inline(buf, ctx)})
    return blocks


def number_missions(blocks: list) -> int:
    """Dá um número pra cada missão (item de lista com [ ]), na ordem do texto."""
    count = 0

    def walk(bs):
        nonlocal count
        for b in bs:
            if b["t"] in ("ul", "ol"):
                for it in b["items"]:
                    if it.get("task"):
                        it["m"] = count
                        count += 1
                    for sub in it.get("sub", []):
                        walk([sub])
            elif b["t"] == "quote":
                walk(b["c"])

    walk(blocks)
    return count


def plain_text(nodes: list) -> str:
    out = []
    for n in nodes:
        if n["t"] in ("text", "code"):
            out.append(n["v"])
        elif "c" in n:
            out.append(plain_text(n["c"]))
    return "".join(out)


def compile_doc(path: pathlib.Path) -> dict:
    ctx = Ctx(str(path.relative_to(ROOT)))
    lines = path.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
    blocks = parse_blocks(lines, ctx)
    if not blocks or blocks[0]["t"] != "h" or blocks[0]["l"] != 1:
        raise BuildError(f"{ctx.origem}: o arquivo precisa começar com um título # ")
    title = plain_text(blocks[0]["c"]).strip()
    blocks = blocks[1:]
    missions = number_missions(blocks)
    return {"titulo": title, "missoes": missions, "blocos": blocks, "_ctx": ctx}


# ---------------------------------------------------------------------------
# Saída
# ---------------------------------------------------------------------------

def main() -> int:
    docs: dict = {}
    fases = []
    total_missoes = 0
    for p in PHASES:
        cartuchos = []
        for c in p["cartuchos"]:
            path = CONTENT_DIR / c["arquivo"]
            if not path.exists():
                raise BuildError(f"arquivo não encontrado: {path}")
            doc = compile_doc(path)
            ctx = doc.pop("_ctx")
            docs[c["id"]] = doc
            total_missoes += doc["missoes"]
            cartuchos.append({"id": c["id"], "rotulo": c["rotulo"], "arquivo": c["arquivo"]})
            print(f"  ✓ {c['arquivo']}: {doc['missoes']} missões, "
                  f"{ctx.links_externos} links externos, {ctx.links_internos} internos")
        fases.append({
            "numero": p["numero"],
            "icone": p["icone"],
            "nome": p["nome"],
            "resumo": p["resumo"],
            "revisao": p["revisao"],
            "cartuchos": cartuchos,
        })

    manual = compile_doc(DOCS_FILE)
    manual.pop("_ctx")
    print(f"  ✓ docs/PROJETO.md")

    data = {"fases": fases, "docs": docs, "manual": manual, "revisao": REVISAO}
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    js = (
        "// Arquivo GERADO por scripts/build.py a partir de conteudos/ e docs/.\n"
        "// Não edite à mão: tuas mudanças vão sumir no próximo build.\n"
        f"export const CONTENT = {payload};\n"
    )
    OUT_FILE.write_text(js, encoding="utf-8")

    # Versão do cache do service worker = hash de todos os arquivos do site.
    h = hashlib.sha256()
    for asset in SW_ASSETS:
        if asset == "./":
            continue
        f = SITE_DIR / asset[2:]
        if not f.exists():
            raise BuildError(f"arquivo listado no service worker não existe: {asset}")
        h.update(f.read_bytes())
    version = h.hexdigest()[:12]
    sw = SW_FILE.read_text(encoding="utf-8")
    sw_new, n = re.subn(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", sw)
    if n != 1:
        raise BuildError("não achei a linha const VERSION no sw.js")
    sw_new, n = re.subn(
        r"const ASSETS = \[[^\]]*\];",
        "const ASSETS = " + json.dumps(SW_ASSETS) + ";",
        sw_new,
    )
    if n != 1:
        raise BuildError("não achei a linha const ASSETS no sw.js")
    SW_FILE.write_text(sw_new, encoding="utf-8")

    print(f"\n  {len(docs)} cartuchos, {total_missoes} missões no total")
    print(f"  content.js: {len(js.encode('utf-8')) // 1024} KB · cache do service worker: {version}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BuildError as e:
        print(f"\n✗ Build falhou: {e}", file=sys.stderr)
        sys.exit(1)
