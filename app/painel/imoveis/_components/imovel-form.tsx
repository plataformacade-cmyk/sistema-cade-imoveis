"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  criarImovel,
  editarImovel,
  type ImovelState,
} from "@/actions/imoveis";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PACOTE_NAO_CONTRATAR,
  PACOTE_SERVICO_JURIDICO_INFO,
  type PacoteServicoJuridicoForm,
  type TipoNegocioServicoJuridico,
} from "@/lib/servicos-juridicos";
import {
  TIPO_NEGOCIO_OPCOES,
  TIPO_NEGOCIO_PADRAO,
  rotuloValorAnuncio,
  type TipoNegocio,
} from "@/lib/negocios/tipo";

export type ImovelEditavel = {
  id: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo: string | null;
  tipo_negocio: TipoNegocio | null;
  area_m2: number | null;
  quartos: number | null;
  vagas: number | null;
  ano_construcao: number | null;
  valor_anuncio: number | null;
  status: string;
  fotos: string[];
  servico_juridico_pacote?: PacoteServicoJuridicoForm;
  servico_juridico_tipo_negocio?: TipoNegocioServicoJuridico;
  servico_juridico_observacoes?: string | null;
};

const TIPOS = [
  { value: "casa", label: "Casa" },
  { value: "apartamento", label: "Apartamento" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
];

const STATUSES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativo", label: "Ativo" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "vendido", label: "Vendido" },
  { value: "arquivado", label: "Arquivado" },
];

const MAX_FOTOS = 10;

export function ImovelForm({
  imovel,
  usuarioId,
  isAdmin = false,
}: {
  imovel?: ImovelEditavel;
  usuarioId: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const editando = Boolean(imovel);
  const action = editando ? editarImovel : criarImovel;

  const [state, formAction, pending] = useActionState<ImovelState, FormData>(
    action,
    {},
  );

  // Estado controlado dos campos que o ViaCEP/Select preenchem.
  const [cep, setCep] = useState(imovel?.cep ?? "");
  const [logradouro, setLogradouro] = useState(imovel?.logradouro ?? "");
  const [bairro, setBairro] = useState(imovel?.bairro ?? "");
  const [cidade, setCidade] = useState(imovel?.cidade ?? "");
  const [uf, setUf] = useState(imovel?.uf ?? "");
  const [tipo, setTipo] = useState(imovel?.tipo ?? "");
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(
    imovel?.tipo_negocio ?? TIPO_NEGOCIO_PADRAO,
  );
  const [status, setStatus] = useState(imovel?.status ?? "rascunho");
  const [servicoPacote, setServicoPacote] =
    useState<PacoteServicoJuridicoForm>(
      imovel?.servico_juridico_pacote ?? PACOTE_NAO_CONTRATAR,
    );
  const [servicoTipo, setServicoTipo] =
    useState<TipoNegocioServicoJuridico>(
      imovel?.servico_juridico_tipo_negocio ??
        imovel?.tipo_negocio ??
        TIPO_NEGOCIO_PADRAO,
    );
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Fotos: URLs públicas já enviadas ao storage.
  const [fotos, setFotos] = useState<string[]>(imovel?.fotos ?? []);
  const [enviandoFotos, setEnviandoFotos] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reage ao retorno da Server Action.
  useEffect(() => {
    if (state.ok) {
      toast.success(editando ? "Imóvel atualizado." : "Imóvel cadastrado.");
      if (state.warning) toast.warning(state.warning);
      router.push("/painel/imoveis");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, editando, router]);

  async function buscarCep() {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        if (!isAdmin) {
          setLogradouro("");
          setBairro("");
          setCidade("");
          setUf("");
        }
        toast.error("CEP não encontrado.");
        return;
      }
      setLogradouro(data.logradouro ?? "");
      setBairro(data.bairro ?? "");
      setCidade(data.localidade ?? "");
      setUf(data.uf ?? "");
      if (!data.bairro || !data.localidade || !data.uf) {
        toast.warning(
          isAdmin
            ? "CEP sem bairro/cidade completos. Revise manualmente antes de salvar."
            : "CEP sem bairro/cidade completos. Confira o CEP ou fale com o suporte.",
        );
      }
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function enviarFotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const restante = MAX_FOTOS - fotos.length;
    if (restante <= 0) {
      toast.error(`Máximo de ${MAX_FOTOS} fotos.`);
      return;
    }
    const lista = Array.from(files).slice(0, restante);
    setEnviandoFotos(true);
    const supabase = createClient();
    const novas: string[] = [];
    try {
      for (const file of lista) {
        // Compressão client-side: máx 1MB / 1920px, qualidade 0.85.
        const arquivo = file.type.startsWith("image/")
          ? await imageCompression(file, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.85,
            }).catch(() => file)
          : file;
        const ext = (arquivo.name.split(".").pop() ?? "jpg").toLowerCase();
        const caminho = `${usuarioId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("imovel-fotos")
          .upload(caminho, arquivo, { upsert: false });
        if (error) {
          toast.error(`Falha ao enviar ${file.name}.`);
          continue;
        }
        const { data } = supabase.storage
          .from("imovel-fotos")
          .getPublicUrl(caminho);
        novas.push(data.publicUrl);
      }
      if (novas.length) {
        setFotos((f) => [...f, ...novas]);
        toast.success(`${novas.length} foto(s) enviada(s).`);
      }
    } finally {
      setEnviandoFotos(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removerFoto(url: string) {
    setFotos((f) => f.filter((u) => u !== url));
  }

  function selecionarServicoPacote(valor: string) {
    const pacote = valor as PacoteServicoJuridicoForm;
    setServicoPacote(pacote);
    const tipoPadrao = PACOTE_SERVICO_JURIDICO_INFO[pacote]?.tipoPadrao;
    if (tipoPadrao) setServicoTipo(tipoPadrao);
  }

  function selecionarTipoNegocio(valor: string) {
    const proximo = valor === "locacao" ? "locacao" : "venda";
    setTipoNegocio(proximo);
    if (servicoPacote === PACOTE_NAO_CONTRATAR) setServicoTipo(proximo);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {editando && <input type="hidden" name="id" value={imovel!.id} />}
      {/* Fotos serializadas pra Server Action (são enviadas pelo client). */}
      <input type="hidden" name="fotos" value={JSON.stringify(fotos)} />
      <input
        type="hidden"
        name="servico_juridico_pacote"
        value={servicoPacote}
      />
      <input
        type="hidden"
        name="servico_juridico_tipo_negocio"
        value={servicoTipo}
      />
      {!isAdmin && (
        <>
          <input type="hidden" name="bairro" value={bairro} />
          <input type="hidden" name="cidade" value={cidade} />
          <input type="hidden" name="uf" value={uf} />
        </>
      )}

      <Tabs defaultValue="endereco">
        <TabsList>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="caracteristicas">Características</TabsTrigger>
          <TabsTrigger value="valor">Valor &amp; Fotos</TabsTrigger>
          <TabsTrigger value="juridico">Juridico</TabsTrigger>
        </TabsList>

        {/* ABA ENDEREÇO */}
        <TabsContent value="endereco">
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>
                Digite o CEP e saia do campo para preencher automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  name="cep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={buscarCep}
                  placeholder="00000-000"
                  required
                />
                {buscandoCep && (
                  <span className="text-muted-foreground text-xs">
                    Consultando CEP...
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input
                  id="logradouro"
                  name="logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" name="numero" defaultValue={imovel?.numero ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  name="complemento"
                  defaultValue={imovel?.complemento ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  name={isAdmin ? "bairro" : undefined}
                  value={bairro}
                  onChange={(e) => isAdmin && setBairro(e.target.value)}
                  readOnly={!isAdmin}
                  aria-describedby="endereco-derivado-ajuda"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  name={isAdmin ? "cidade" : undefined}
                  value={cidade}
                  onChange={(e) => isAdmin && setCidade(e.target.value)}
                  readOnly={!isAdmin}
                  aria-describedby="endereco-derivado-ajuda"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  name={isAdmin ? "uf" : undefined}
                  maxLength={2}
                  value={uf}
                  onChange={(e) =>
                    isAdmin && setUf(e.target.value.toUpperCase())
                  }
                  readOnly={!isAdmin}
                  placeholder="SP"
                  aria-describedby="endereco-derivado-ajuda"
                />
              </div>
              <p
                id="endereco-derivado-ajuda"
                className="text-muted-foreground text-xs sm:col-span-2"
              >
                {isAdmin
                  ? "Bairro, cidade e UF sao derivados do CEP; admin pode corrigir quando a base externa retornar dados incompletos."
                  : "Bairro, cidade e UF sao derivados do CEP para manter a vitrine consistente."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA CARACTERÍSTICAS */}
        <TabsContent value="caracteristicas">
          <Card>
            <CardHeader>
              <CardTitle>Características</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tipo-trigger">Tipo</Label>
                <Select
                  name="tipo"
                  items={TIPOS}
                  value={tipo}
                  onValueChange={(v) => setTipo(String(v ?? ""))}
                >
                  <SelectTrigger id="tipo-trigger" className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="area_m2">Área (m²)</Label>
                <Input
                  id="area_m2"
                  name="area_m2"
                  inputMode="decimal"
                  defaultValue={imovel?.area_m2 ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="quartos">Quartos</Label>
                <Input
                  id="quartos"
                  name="quartos"
                  type="number"
                  min={0}
                  defaultValue={imovel?.quartos ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vagas">Vagas</Label>
                <Input
                  id="vagas"
                  name="vagas"
                  type="number"
                  min={0}
                  defaultValue={imovel?.vagas ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ano_construcao">Ano de construção</Label>
                <Input
                  id="ano_construcao"
                  name="ano_construcao"
                  type="number"
                  min={0}
                  defaultValue={imovel?.ano_construcao ?? ""}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA VALOR & FOTOS */}
        <TabsContent value="valor">
          <Card>
            <CardHeader>
              <CardTitle>Valor &amp; Fotos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tipo-negocio-trigger">Operacao</Label>
                <Select
                  name="tipo_negocio"
                  items={TIPO_NEGOCIO_OPCOES}
                  value={tipoNegocio}
                  onValueChange={(v) => selecionarTipoNegocio(String(v ?? ""))}
                >
                  <SelectTrigger id="tipo-negocio-trigger" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_NEGOCIO_OPCOES.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="valor_anuncio">
                  {rotuloValorAnuncio(tipoNegocio)} (R$)
                </Label>
                <Input
                  id="valor_anuncio"
                  name="valor_anuncio"
                  inputMode="decimal"
                  defaultValue={imovel?.valor_anuncio ?? ""}
                  placeholder={tipoNegocio === "locacao" ? "2500" : "450000"}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="status-trigger">Status</Label>
                <Select
                  name="status"
                  items={STATUSES}
                  value={status}
                  onValueChange={(v) => setStatus(String(v ?? "rascunho"))}
                >
                  <SelectTrigger id="status-trigger" className="w-full">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="fotos-input">
                  Fotos ({fotos.length}/{MAX_FOTOS})
                </Label>
                <Input
                  id="fotos-input"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={enviandoFotos || fotos.length >= MAX_FOTOS}
                  onChange={(e) => enviarFotos(e.target.files)}
                />
                {enviandoFotos && (
                  <span className="text-muted-foreground text-xs">
                    Enviando fotos...
                  </span>
                )}
                {fotos.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {fotos.map((url) => (
                      <div
                        key={url}
                        className="group relative aspect-square overflow-hidden rounded-md border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Foto do imóvel"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removerFoto(url)}
                          className="bg-background/80 absolute top-1 right-1 rounded px-1.5 py-0.5 text-xs font-medium text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="juridico">
          <Card>
            <CardHeader>
              <CardTitle>Servicos juridicos Cade</CardTitle>
              <CardDescription>
                Contratacao formal interna. Valores, pagamento e atendimento
                operacional serao alinhados fora do app nesta versao.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <RadioGroup
                value={servicoPacote}
                onValueChange={selecionarServicoPacote}
                className="grid gap-3 md:grid-cols-2"
              >
                {Object.entries(PACOTE_SERVICO_JURIDICO_INFO).map(
                  ([value, info]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:border-primary/60"
                    >
                      <RadioGroupItem value={value} className="mt-1" />
                      <span className="flex flex-col gap-1">
                        <span className="font-medium">{info.label}</span>
                        <span className="text-muted-foreground">
                          {info.descricao}
                        </span>
                      </span>
                    </label>
                  ),
                )}
              </RadioGroup>

              {servicoPacote !== PACOTE_NAO_CONTRATAR && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="servico-tipo-trigger">
                      Tipo de operacao
                    </Label>
                    <Select
                      name="servico_juridico_tipo_negocio_select"
                      value={servicoTipo}
                      onValueChange={(v) =>
                        setServicoTipo(
                          String(v ?? "venda") as TipoNegocioServicoJuridico,
                        )
                      }
                      disabled={Boolean(
                        PACOTE_SERVICO_JURIDICO_INFO[servicoPacote]
                          ?.tipoPadrao,
                      )}
                    >
                      <SelectTrigger
                        id="servico-tipo-trigger"
                        className="w-full"
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="locacao">Locacao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="servico_juridico_observacoes">
                      Observacoes
                    </Label>
                    <Textarea
                      id="servico_juridico_observacoes"
                      name="servico_juridico_observacoes"
                      defaultValue={imovel?.servico_juridico_observacoes ?? ""}
                      placeholder="Contexto para o time juridico, se houver."
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || enviandoFotos}>
          {pending
            ? "Salvando..."
            : editando
              ? "Salvar alterações"
              : "Cadastrar imóvel"}
        </Button>
        <Link
          href="/painel/imoveis"
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
