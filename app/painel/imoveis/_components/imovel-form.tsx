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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  area_m2: number | null;
  quartos: number | null;
  vagas: number | null;
  ano_construcao: number | null;
  valor_anuncio: number | null;
  status: string;
  fotos: string[];
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
}: {
  imovel?: ImovelEditavel;
  usuarioId: string;
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
  const [status, setStatus] = useState(imovel?.status ?? "rascunho");
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Fotos: URLs públicas já enviadas ao storage.
  const [fotos, setFotos] = useState<string[]>(imovel?.fotos ?? []);
  const [enviandoFotos, setEnviandoFotos] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reage ao retorno da Server Action.
  useEffect(() => {
    if (state.ok) {
      toast.success(editando ? "Imóvel atualizado." : "Imóvel cadastrado.");
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
        toast.error("CEP não encontrado.");
        return;
      }
      setLogradouro(data.logradouro ?? "");
      setBairro(data.bairro ?? "");
      setCidade(data.localidade ?? "");
      setUf(data.uf ?? "");
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
        // TODO: comprimir a imagem no client antes do upload.
        const ext = file.name.split(".").pop() ?? "jpg";
        const caminho = `${usuarioId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("imovel-fotos")
          .upload(caminho, file, { upsert: false });
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

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {editando && <input type="hidden" name="id" value={imovel!.id} />}
      {/* Fotos serializadas pra Server Action (são enviadas pelo client). */}
      <input type="hidden" name="fotos" value={JSON.stringify(fotos)} />

      <Tabs defaultValue="endereco">
        <TabsList>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="caracteristicas">Características</TabsTrigger>
          <TabsTrigger value="valor">Valor &amp; Fotos</TabsTrigger>
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
                  name="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  name="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  name="uf"
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  placeholder="SP"
                />
              </div>
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
                <Label htmlFor="valor_anuncio">Valor do anúncio (R$)</Label>
                <Input
                  id="valor_anuncio"
                  name="valor_anuncio"
                  inputMode="decimal"
                  defaultValue={imovel?.valor_anuncio ?? ""}
                  placeholder="450000"
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
