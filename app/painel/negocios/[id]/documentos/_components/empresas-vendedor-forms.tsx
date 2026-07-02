"use client";

import { useActionState, useEffect } from "react";
import { Building2, Link2Off, Save } from "lucide-react";
import { toast } from "sonner";
import {
  cadastrarVincularEmpresaVendedor,
  desvincularEmpresaVendedor,
  salvarDeclaracaoEmpresaVendedor,
  type EmpresaVendedorState,
} from "@/actions/empresas-vendedor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function useToastState(state: EmpresaVendedorState) {
  useEffect(() => {
    if (state.message) toast.success(state.message);
    if (state.error) toast.error(state.error);
  }, [state]);
}

export function DeclaracaoEmpresaForm({
  negocioId,
  vendedorId,
}: {
  negocioId: string;
  vendedorId: string;
}) {
  const [state, formAction, pending] = useActionState<
    EmpresaVendedorState,
    FormData
  >(salvarDeclaracaoEmpresaVendedor, {});
  useToastState(state);

  return (
    <div className="flex flex-wrap gap-2">
      <form action={formAction}>
        <input type="hidden" name="negocio_id" value={negocioId} />
        <input type="hidden" name="vendedor_id" value={vendedorId} />
        <input type="hidden" name="possui_empresa" value="false" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <Save className="size-4" />
          Declarar sem empresa
        </Button>
      </form>

      <form action={formAction}>
        <input type="hidden" name="negocio_id" value={negocioId} />
        <input type="hidden" name="vendedor_id" value={vendedorId} />
        <input type="hidden" name="possui_empresa" value="true" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <Building2 className="size-4" />
          Informar empresa
        </Button>
      </form>
    </div>
  );
}

export function CadastrarEmpresaVendedorForm({
  negocioId,
  vendedorId,
}: {
  negocioId: string;
  vendedorId: string;
}) {
  const [state, formAction, pending] = useActionState<
    EmpresaVendedorState,
    FormData
  >(cadastrarVincularEmpresaVendedor, {});
  useToastState(state);

  return (
    <form action={formAction} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="negocio_id" value={negocioId} />
      <input type="hidden" name="vendedor_id" value={vendedorId} />
      <Input
        name="cnpj"
        inputMode="numeric"
        placeholder="CNPJ"
        required
        disabled={pending}
      />
      <Input
        name="razao_social"
        placeholder="Razao social opcional"
        disabled={pending}
      />
      <Button type="submit" size="sm" disabled={pending}>
        <Building2 className="size-4" />
        Vincular
      </Button>
      <Input
        name="nome_fantasia"
        placeholder="Nome fantasia opcional"
        disabled={pending}
        className="md:col-span-2"
      />
    </form>
  );
}

export function DesvincularEmpresaButton({
  negocioId,
  vendedorId,
  vinculoId,
}: {
  negocioId: string;
  vendedorId: string;
  vinculoId: string;
}) {
  const [state, formAction, pending] = useActionState<
    EmpresaVendedorState,
    FormData
  >(desvincularEmpresaVendedor, {});
  useToastState(state);

  return (
    <form action={formAction}>
      <input type="hidden" name="negocio_id" value={negocioId} />
      <input type="hidden" name="vendedor_id" value={vendedorId} />
      <input type="hidden" name="vinculo_id" value={vinculoId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        <Link2Off className="size-4" />
        Desvincular
      </Button>
    </form>
  );
}
