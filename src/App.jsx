import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

const RED = '#e63027'
const BG = '#0a0a0a'
const CARD = '#111111'
const BORDER = '#1f1f1f'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState('jogos')
  const [jogos, setJogos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '', descricao: '', console: '', capa_url: '',
    rom_url: '', preco: 0, gratuito: true, ativo: true, premium: false
  })
  const [arquivoCapa, setArquivoCapa] = useState(null)
  const [arquivoRom, setArquivoRom] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUsuario(data.session.user)
    })
  }, [])

  useEffect(() => {
    if (usuario) {
      carregarJogos()
      carregarUsuarios()
    }
  }, [usuario])

  async function handleLogin() {
    setErro('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('Email ou senha incorretos.')
    else setUsuario(data.user)
  }

  async function carregarJogos() {
    setLoading(true)
    const { data } = await supabase.from('jogos').select('*').order('criado_em', { ascending: false })
    if (data) setJogos(data)
    setLoading(false)
  }

  async function carregarUsuarios() {
    const { data } = await supabase.from('usuarios').select('*').order('criado_em', { ascending: false })
    if (data) setUsuarios(data)
  }

  async function uploadArquivo(bucket, arquivo) {
    const ext = arquivo.name.split('.').pop()
    const nome = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(nome, arquivo)
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(nome)
    return data.publicUrl
  }

  async function salvarJogo() {
    if (!form.nome || !form.console) { setErro('Nome e console são obrigatórios.'); return }
    if (!arquivoRom && !form.rom_url) { setErro('Selecione o arquivo da ROM.'); return }
    setSalvando(true); setErro(''); setSucesso('')
    try {
      let capa_url = form.capa_url
      let rom_url = form.rom_url
      if (arquivoCapa) { setProgresso('Enviando capa...'); capa_url = await uploadArquivo('capas', arquivoCapa) }
      if (arquivoRom) { setProgresso('Enviando ROM...'); rom_url = await uploadArquivo('roms', arquivoRom) }
      setProgresso('Salvando jogo...')
      const { error } = await supabase.from('jogos').insert([{ ...form, capa_url, rom_url }])
      if (error) throw error
      setSucesso('Jogo cadastrado com sucesso!')
      setForm({ nome: '', descricao: '', console: '', capa_url: '', rom_url: '', preco: 0, gratuito: true, ativo: true, premium: false })
      setArquivoCapa(null); setArquivoRom(null); setProgresso('')
      carregarJogos(); setAba('jogos')
    } catch (e) { setErro('Erro ao salvar: ' + e.message) }
    setSalvando(false)
  }

  async function toggleAtivo(jogo) {
    await supabase.from('jogos').update({ ativo: !jogo.ativo }).eq('id', jogo.id)
    carregarJogos()
  }

  async function deletarJogo(id) {
  if (!confirm('Deletar este jogo?')) return
  await supabase.from('biblioteca').delete().eq('jogo_id', id)
  await supabase.from('jogos').delete().eq('id', id)
  carregarJogos()
}

  async function togglePremiumUsuario(u) {
    await supabase.from('usuarios').update({ premium: !u.premium }).eq('id', u.id)
    carregarUsuarios()
  }

  async function toggleVitalicioUsuario(u) {
    await supabase.from('usuarios').update({ premium_vitalicio: !u.premium_vitalicio, premium: true }).eq('id', u.id)
    carregarUsuarios()
  }

  async function deletarUsuario(id) {
    if (!confirm('Deletar este usuário?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    carregarUsuarios()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUsuario(null)
  }

  if (!usuario) return (
    <div style={styles.loginContainer}>
      <div style={styles.loginBox}>
        <h1 style={styles.loginTitulo}>
          <span style={{ color: '#fff' }}>NEX</span><span style={{ color: RED }}>US</span>
          <span style={{ color: '#444', fontSize: '14px', fontWeight: '400' }}> ADMIN</span>
        </h1>
        <p style={styles.loginSub}>Acesso restrito</p>
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {erro && <p style={styles.erro}>{erro}</p>}
        <button style={styles.btn} onClick={handleLogin}>ENTRAR</button>
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitulo}>
          <span style={{ color: '#fff' }}>NEX</span><span style={{ color: RED }}>US</span>
          <span style={{ color: '#444', fontSize: '12px', fontWeight: '400', letterSpacing: '3px' }}> ADMIN</span>
        </h1>
        <div style={styles.headerRight}>
          <span style={styles.headerEmail}>{usuario.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>SAIR</button>
        </div>
      </div>

      <div style={styles.navbar}>
        <button style={aba === 'jogos' ? styles.navAtivo : styles.navItem} onClick={() => setAba('jogos')}>🎮 JOGOS</button>
        <button style={aba === 'novo' ? styles.navAtivo : styles.navItem} onClick={() => setAba('novo')}>➕ NOVO JOGO</button>
        <button style={aba === 'usuarios' ? styles.navAtivo : styles.navItem} onClick={() => { setAba('usuarios'); carregarUsuarios() }}>👥 USUÁRIOS</button>
      </div>

      <div style={styles.content}>

        {/* JOGOS */}
        {aba === 'jogos' && (
          <div>
            <h2 style={styles.titulo}>JOGOS CADASTRADOS</h2>
            {loading && <p style={styles.hint}>Carregando...</p>}
            {!loading && jogos.length === 0 && <p style={styles.hint}>Nenhum jogo cadastrado ainda.</p>}
            <table style={styles.tabela}>
              <thead>
                <tr>{['CAPA', 'NOME', 'CONSOLE', 'PREÇO', 'GRÁTIS', 'PREMIUM', 'ATIVO', 'AÇÕES'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {jogos.map(jogo => (
                  <tr key={jogo.id} style={styles.tr}>
                    <td style={styles.td}>
                      {jogo.capa_url ? <img src={jogo.capa_url} style={styles.capaThumb} /> : <div style={styles.capaVazia}>🎮</div>}
                    </td>
                    <td style={styles.td}>{jogo.nome}</td>
                    <td style={styles.td}>{jogo.console}</td>
                    <td style={styles.td}>R$ {Number(jogo.preco).toFixed(2)}</td>
                    <td style={styles.td}>{jogo.gratuito ? '✅' : '❌'}</td>
                    <td style={styles.td}>{jogo.premium ? '⭐' : '—'}</td>
                    <td style={styles.td}>
                      <button style={jogo.ativo ? styles.btnAtivo : styles.btnInativo} onClick={() => toggleAtivo(jogo)}>
                        {jogo.ativo ? 'ATIVO' : 'INATIVO'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.btnDeletar} onClick={() => deletarJogo(jogo.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* NOVO JOGO */}
        {aba === 'novo' && (
          <div style={styles.formBox}>
            <h2 style={styles.titulo}>CADASTRAR NOVO JOGO</h2>
            {sucesso && <p style={styles.sucesso}>{sucesso}</p>}
            {erro && <p style={styles.erro}>{erro}</p>}
            {progresso && <p style={styles.progresso}>⏳ {progresso}</p>}
            <div style={styles.formGrid}>
              <div style={styles.formGrupo}>
                <label style={styles.label}>NOME DO JOGO *</label>
                <input style={styles.input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Super Mario Bros" />
              </div>
              <div style={styles.formGrupo}>
                <label style={styles.label}>CONSOLE *</label>
                <select style={styles.input} value={form.console} onChange={e => setForm({ ...form, console: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="NES">NES</option>
                  <option value="SNES">SNES</option>
                  <option value="Nintendo 64">Nintendo 64</option>
                  <option value="Game Boy">Game Boy</option>
                  <option value="Game Boy Advance">Game Boy Advance</option>
                  <option value="Nintendo DS">Nintendo DS</option>
                  <option value="GameCube">GameCube</option>
                  <option value="Wii">Wii</option>
                  <option value="Indie">Indie</option>
                </select>
              </div>
              <div style={styles.formGrupo}>
                <label style={styles.label}>CAPA DO JOGO</label>
                <input style={styles.inputFile} type="file" accept="image/*" onChange={e => setArquivoCapa(e.target.files[0])} />
                {arquivoCapa && <span style={styles.nomeArquivo}>✅ {arquivoCapa.name}</span>}
              </div>
              <div style={styles.formGrupo}>
                <label style={styles.label}>ARQUIVO DA ROM *</label>
                <input style={styles.inputFile} type="file" accept=".nes,.sfc,.smc,.n64,.z64,.v64,.gb,.gbc,.gba,.nds,.iso,.wbfs,.elf,.rom,.bin" onChange={e => setArquivoRom(e.target.files[0])} />
                {arquivoRom && <span style={styles.nomeArquivo}>✅ {arquivoRom.name}</span>}
              </div>
              <div style={styles.formGrupo}>
                <label style={styles.label}>GRATUITO</label>
                <select style={styles.input} value={form.gratuito} onChange={e => setForm({ ...form, gratuito: e.target.value === 'true', preco: e.target.value === 'true' ? 0 : form.preco })}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div style={styles.formGrupo}>
                <label style={styles.label}>EXCLUSIVO PREMIUM</label>
                <select style={styles.input} value={form.premium} onChange={e => setForm({ ...form, premium: e.target.value === 'true' })}>
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </div>
              {!form.gratuito && (
                <div style={styles.formGrupo}>
                  <label style={styles.label}>PREÇO (R$)</label>
                  <input style={styles.input} type="number" step="0.01" value={form.preco} onChange={e => setForm({ ...form, preco: parseFloat(e.target.value) })} placeholder="0.00" />
                </div>
              )}
              <div style={{ ...styles.formGrupo, gridColumn: '1 / -1' }}>
                <label style={styles.label}>DESCRIÇÃO</label>
                <textarea style={{ ...styles.input, height: '100px', resize: 'vertical' }} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do jogo..." />
              </div>
            </div>
            <button style={{ ...styles.btnSalvar, opacity: salvando ? 0.6 : 1 }} onClick={salvarJogo} disabled={salvando}>
              {salvando ? `⏳ ${progresso || 'SALVANDO...'}` : '💾 SALVAR JOGO'}
            </button>
          </div>
        )}

        {/* USUÁRIOS */}
        {aba === 'usuarios' && (
          <div>
            <h2 style={styles.titulo}>GERENCIAR USUÁRIOS</h2>
            <p style={styles.hint}>{usuarios.length} usuário(s) cadastrado(s)</p>
            <table style={{ ...styles.tabela, marginTop: '16px' }}>
              <thead>
                <tr>{['EMAIL', 'PREMIUM', 'VITALÍCIO', 'CADASTRO', 'AÇÕES'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <button style={u.premium ? styles.btnAtivo : styles.btnInativo} onClick={() => togglePremiumUsuario(u)}>
                        {u.premium ? '⭐ PREMIUM' : 'COMUM'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button style={u.premium_vitalicio ? styles.btnVitalicio : styles.btnInativo} onClick={() => toggleVitalicioUsuario(u)}>
                        {u.premium_vitalicio ? '♾️ VITALÍCIO' : 'NÃO'}
                      </button>
                    </td>
                    <td style={styles.td}>{new Date(u.criado_em).toLocaleDateString('pt-BR')}</td>
                    <td style={styles.td}>
                      <button style={styles.btnDeletar} onClick={() => deletarUsuario(u.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  loginContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: BG, fontFamily: '"Segoe UI", sans-serif' },
  loginBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '360px', padding: '48px 40px', backgroundColor: CARD, border: `1px solid ${BORDER}`, borderRadius: '8px' },
  loginTitulo: { margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', letterSpacing: '3px' },
  loginSub: { color: '#333', fontSize: '12px', margin: '0 0 32px 0', letterSpacing: '1px' },
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: BG, color: '#fff', fontFamily: '"Segoe UI", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', backgroundColor: '#000', height: '56px', borderBottom: `1px solid ${BORDER}` },
  headerTitulo: { margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '2px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerEmail: { color: '#444', fontSize: '12px' },
  logoutBtn: { background: 'none', border: `1px solid ${BORDER}`, color: '#555', cursor: 'pointer', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', padding: '6px 12px', borderRadius: '3px' },
  navbar: { display: 'flex', backgroundColor: '#000', borderBottom: `2px solid ${BORDER}`, padding: '0 32px', gap: '4px' },
  navItem: { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#555', padding: '14px 20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', marginBottom: '-2px' },
  navAtivo: { background: 'none', border: 'none', borderBottom: `2px solid ${RED}`, color: '#fff', padding: '14px 20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', marginBottom: '-2px' },
  content: { padding: '40px 32px', flex: 1 },
  titulo: { fontSize: '18px', fontWeight: '900', letterSpacing: '2px', color: '#fff', marginBottom: '24px', borderLeft: `3px solid ${RED}`, paddingLeft: '12px' },
  hint: { color: '#444', fontSize: '13px' },
  tabela: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#555', borderBottom: `1px solid ${BORDER}` },
  tr: { borderBottom: `1px solid ${BORDER}` },
  td: { padding: '14px 16px', fontSize: '13px', color: '#ccc' },
  capaThumb: { width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' },
  capaVazia: { width: '48px', height: '48px', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '20px' },
  btnAtivo: { backgroundColor: '#1a3a1a', border: '1px solid #2a5a2a', color: '#4caf50', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' },
  btnInativo: { backgroundColor: '#3a1a1a', border: '1px solid #5a2a2a', color: '#e63027', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' },
  btnVitalicio: { backgroundColor: '#1a1a3a', border: '1px solid #2a2a5a', color: '#7c7cff', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' },
  btnDeletar: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' },
  formBox: { maxWidth: '800px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' },
  formGrupo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#555' },
  input: { backgroundColor: '#0a0a0a', border: `1px solid ${BORDER}`, borderRadius: '4px', color: '#fff', padding: '11px 14px', fontSize: '13px', outline: 'none', fontFamily: '"Segoe UI", sans-serif' },
  inputFile: { backgroundColor: '#0a0a0a', border: `1px dashed ${BORDER}`, borderRadius: '4px', color: '#555', padding: '11px 14px', fontSize: '13px', cursor: 'pointer' },
  nomeArquivo: { color: '#4caf50', fontSize: '11px' },
  btnSalvar: { backgroundColor: RED, border: 'none', color: '#fff', padding: '14px 32px', cursor: 'pointer', fontWeight: '900', fontSize: '13px', letterSpacing: '2px', borderRadius: '4px' },
  erro: { color: RED, fontSize: '12px', margin: '0 0 12px 0' },
  sucesso: { color: '#4caf50', fontSize: '13px', margin: '0 0 20px 0', fontWeight: '700' },
  progresso: { color: '#f0a500', fontSize: '13px', margin: '0 0 12px 0', fontWeight: '700' },
  btn: { width: '100%', backgroundColor: RED, border: 'none', color: '#fff', padding: '13px', cursor: 'pointer', fontWeight: '900', fontSize: '13px', letterSpacing: '2px', borderRadius: '4px', marginTop: '4px' },
}