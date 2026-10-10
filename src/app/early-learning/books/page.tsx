"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { BookShelf } from "@/components/books/BookShelf";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";

export default function BooksPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Picture Books" moduleId="books" />
      <ClientOnly>
        <BookShelf />
      </ClientOnly>
    </PageContainer>
  );
}
