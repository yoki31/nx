import { getBasicPluginsSection } from '@nx/nx-dev/data-access-menu';
import { DocViewer } from '@nx/nx-dev/feature-doc-viewer';
import { ProcessedDocument, RelatedDocument } from '@nx/nx-dev/models-document';
import { Menu, MenuItem } from '@nx/nx-dev/models-menu';
import { DocumentationHeader, SidebarContainer } from '@nx/nx-dev/ui-common';
import { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { menusApi } from '../../lib/menus.api';
import { useNavToggle } from '../../lib/navigation-toggle.effect';
import { nxPluginsApi } from '../../lib/plugins.api';
import { tagsApi } from '../../lib/tags.api';
import { fetchGithubStarCount } from '../../lib/githubStars.api';

export default function PluginsRoot({
  document,
  menu,
  relatedDocuments,
  widgetData,
}: {
  document: ProcessedDocument;
  menu: MenuItem[];
  relatedDocuments: RelatedDocument[];
  widgetData: { githubStarsCount: number };
}) {
  const router = useRouter();
  const { toggleNav, navIsOpen } = useNavToggle();
  const wrapperElement = useRef(null);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (url.includes('#')) return;
      if (!wrapperElement) return;

      (wrapperElement as any).current.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router, wrapperElement]);

  const vm: {
    document: ProcessedDocument;
    menu: Menu;
    relatedDocuments: RelatedDocument[];
  } = {
    document,
    menu: {
      sections: [getBasicPluginsSection(menu)],
    },
    relatedDocuments,
  };

  return (
    <div id="shell" className="flex h-full flex-col">
      <div className="w-full flex-shrink-0">
        <DocumentationHeader isNavOpen={navIsOpen} toggleNav={toggleNav} />
      </div>
      <main
        id="main"
        role="main"
        className="flex h-full flex-1 overflow-y-hidden"
      >
        <SidebarContainer
          menu={vm.menu}
          navIsOpen={navIsOpen}
          toggleNav={toggleNav}
        />
        <div
          ref={wrapperElement}
          id="wrapper"
          data-testid="wrapper"
          className="relative flex flex-grow flex-col items-stretch justify-start overflow-y-scroll"
        >
          <DocViewer
            document={document}
            relatedDocuments={vm.relatedDocuments}
            widgetData={widgetData}
          />
        </div>
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const document = nxPluginsApi.generateRootDocumentIndex({
    name: 'Extending Nx',
    description: 'Learn more about creating your own plugin, extending Nx.',
  });
  return {
    props: {
      document,
      widgetData: {
        githubStarsCount: await fetchGithubStarCount(),
      },
      menu: menusApi.getMenu('extending-nx', ''),
      relatedDocuments: document.tags
        .map((t) => tagsApi.getAssociatedItems(t))
        .flat(),
    },
  };
};
