import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

describe("ui primitives", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders separator orientations", () => {
    const { rerender } = render(<Separator data-testid="separator" />);
    expect(screen.getByTestId("separator")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );

    rerender(<Separator orientation="vertical" data-testid="separator" />);
    expect(screen.getByTestId("separator")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
  });

  it("renders sheet subcomponents when opened", () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>シートを開く</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>シートタイトル</SheetTitle>
            <SheetDescription>シート説明</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByRole("dialog", { name: "シートタイトル" })).toBeInTheDocument();
    expect(screen.getByText("シート説明")).toBeInTheDocument();
  });

  it("renders tooltip subcomponents", () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>ホバー対象</TooltipTrigger>
          <TooltipContent>ツールチップ本文</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent("ツールチップ本文");
  });

  it("renders dialog subcomponents when opened", () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>ダイアログを開く</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ダイアログタイトル</DialogTitle>
            <DialogDescription>ダイアログ説明</DialogDescription>
          </DialogHeader>
          <DialogFooter>フッター</DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "ダイアログタイトル" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ダイアログ説明")).toBeInTheDocument();
    expect(screen.getByText("フッター")).toBeInTheDocument();
  });

  it("renders card subcomponents", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>カードタイトル</CardTitle>
          <CardDescription>カード説明</CardDescription>
        </CardHeader>
        <CardContent>カード本文</CardContent>
        <CardFooter>カードフッター</CardFooter>
      </Card>,
    );

    expect(screen.getByText("カードタイトル")).toBeInTheDocument();
    expect(screen.getByText("カード説明")).toBeInTheDocument();
    expect(screen.getByText("カード本文")).toBeInTheDocument();
    expect(screen.getByText("カードフッター")).toBeInTheDocument();
  });

  it("renders table subcomponents", () => {
    render(
      <Table>
        <TableCaption>表キャプション</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>列1</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>値1</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>合計</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByText("表キャプション")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "列1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "値1" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "合計" })).toBeInTheDocument();
  });

  it("renders select subcomponents", () => {
    render(
      <Select open>
        <SelectTrigger aria-label="選択">
          <SelectValue placeholder="選んでください" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>グループ</SelectLabel>
            <SelectItem value="a">選択肢A</SelectItem>
            <SelectSeparator />
            <SelectItem value="b">選択肢B</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByText("グループ")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "選択肢A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "選択肢B" })).toBeInTheDocument();
  });

  it("renders alert dialog subcomponents when opened", () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger>確認を開く</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認タイトル</AlertDialogTitle>
            <AlertDialogDescription>確認説明</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction>実行</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(screen.getByRole("alertdialog", { name: "確認タイトル" })).toBeInTheDocument();
    expect(screen.getByText("確認説明")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "実行" })).toBeInTheDocument();
  });
});
