UPDATE service_catalog SET logo='/media/mtn.jpg' WHERE logo='/media/mtn.svg';
UPDATE service_catalog SET logo=NULL WHERE logo IN ('/media/glo.svg','/media/dstv.svg');
